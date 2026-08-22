import { NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import {
  createBranch,
  createPullRequest,
  deleteBranch,
  deleteFile,
  getFileSha,
  uploadFile,
} from '@/app/lib/github'
import { parseConfigLua } from '@/app/lib/packageParser'
import { MAX_METADATA_BYTES, readEntryWithin } from '@/app/lib/packageArchive'
import { fetchRepositoryPackages } from '@/app/lib/packages'
import { bearerToken, rememberToken, verifyActionsToken, TokenError, PUBLISH_AUDIENCE } from '@/app/lib/oidc'
import {
  provenancePathFor,
  serialiseRecord,
  sha256,
  type ProvenanceRecord,
} from '@/app/lib/provenance'
import {
  assertFilenameSane,
  assertPackageMatches,
  authorise,
  loadRegistry,
  PublisherError,
  REGISTRY_PATH,
} from '@/app/lib/trustedPublishers'

/**
 * Trusted publishing: a GitHub Actions workflow submits a new version of its
 * own package with nothing but the OIDC token GitHub minted for that run.
 *
 * The package author stores no credential anywhere. What authorises the
 * publish is an entry in trusted-publishers.json naming their repository and
 * the one workflow file allowed to act for the package - a file that only
 * changes through a reviewed pull request.
 *
 * The outcome is deliberately the same as a website upload: a branch and a pull
 * request opened by the machine account. Every existing gate - the mpackage
 * validation workflow, the review bot, auto-merge - still applies, so this
 * endpoint changes who may *ask*, never what may land.
 */

/** Refuse an archive larger than the website's own upload ceiling. */
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024

/** The artifact must be a release asset of the very repository that was authenticated. */
function assertArtifactBelongsToRun(artifactUrl: string, repository: string): URL {
  let url: URL
  try {
    url = new URL(artifactUrl)
  } catch {
    throw new PublisherError('artifactUrl is not a valid URL')
  }

  if (url.protocol !== 'https:') {
    throw new PublisherError('artifactUrl must be https')
  }
  if (url.hostname !== 'github.com') {
    throw new PublisherError('artifactUrl must be a github.com release asset URL')
  }

  // https://github.com/<owner>/<repo>/releases/download/<tag>/<asset>
  const parts = url.pathname.split('/').filter(Boolean)
  const looksRight =
    parts.length >= 6 && parts[2] === 'releases' && parts[3] === 'download'
  if (!looksRight) {
    throw new PublisherError(
      'artifactUrl must be a release asset: https://github.com/<owner>/<repo>/releases/download/<tag>/<file>',
    )
  }

  const artifactRepo = `${parts[0]}/${parts[1]}`
  if (artifactRepo.toLowerCase() !== repository.toLowerCase()) {
    throw new PublisherError(
      `artifactUrl points at ${artifactRepo}, but the token was issued to ${repository}`,
    )
  }

  return url
}

async function downloadArtifact(url: URL): Promise<Buffer> {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new PublisherError(`could not download the artifact (HTTP ${response.status})`)
  }

  const declared = Number(response.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > MAX_ARCHIVE_BYTES) {
    throw new PublisherError(`artifact is larger than ${MAX_ARCHIVE_BYTES} bytes`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  // Re-check: content-length may have been absent or wrong.
  if (buffer.length > MAX_ARCHIVE_BYTES) {
    throw new PublisherError(`artifact is larger than ${MAX_ARCHIVE_BYTES} bytes`)
  }
  if (buffer.length === 0) {
    throw new PublisherError('the artifact is empty')
  }
  return buffer
}

export async function POST(request: Request) {
  // ---- 1. Who is calling ------------------------------------------------
  const token = bearerToken(request)
  if (!token) {
    return NextResponse.json(
      {
        error:
          'Missing bearer token. Request a GitHub Actions OIDC token with ' +
          `audience "${PUBLISH_AUDIENCE}" and send it as "Authorization: Bearer <token>".`,
      },
      { status: 401 },
    )
  }

  let claims
  try {
    claims = await verifyActionsToken(token)
  } catch (error) {
    const message = error instanceof TokenError ? error.message : 'OIDC token rejected'
    return NextResponse.json({ error: message }, { status: 401 })
  }

  if (!rememberToken(claims)) {
    return NextResponse.json({ error: 'This token has already been used' }, { status: 409 })
  }

  // ---- 2. May they publish this package ---------------------------------
  let publisher
  try {
    publisher = authorise(claims, await loadRegistry())
    assertFilenameSane(publisher.filename)
  } catch (error) {
    if (error instanceof PublisherError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Trusted publishing: registry unavailable', error)
    return NextResponse.json(
      { error: `Could not read ${REGISTRY_PATH}` },
      { status: 503 },
    )
  }

  // ---- 3. Fetch and inspect the artifact --------------------------------
  let body: { artifactUrl?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 })
  }

  if (typeof body.artifactUrl !== 'string' || !body.artifactUrl) {
    return NextResponse.json({ error: 'Missing "artifactUrl"' }, { status: 400 })
  }

  let fileBuffer: Buffer
  try {
    const url = assertArtifactBelongsToRun(body.artifactUrl, claims.repository)
    fileBuffer = await downloadArtifact(url)
  } catch (error) {
    if (error instanceof PublisherError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Trusted publishing: artifact download failed', error)
    return NextResponse.json({ error: 'Could not download the artifact' }, { status: 502 })
  }

  let metadata
  try {
    const zip = new AdmZip(fileBuffer)
    const configEntry = zip.getEntry('config.lua')
    if (!configEntry) {
      return NextResponse.json({ error: 'Missing config.lua' }, { status: 400 })
    }
    const config = readEntryWithin(configEntry, MAX_METADATA_BYTES)
    if (!config) {
      return NextResponse.json(
        { error: 'config.lua is too large to be a Mudlet package config' },
        { status: 400 },
      )
    }
    metadata = parseConfigLua(config.toString('utf8'))
  } catch (error) {
    console.error('Trusted publishing: archive unreadable', error)
    return NextResponse.json({ error: 'The artifact is not a readable zip archive' }, { status: 400 })
  }

  const missing = (['mpackage', 'title', 'version', 'created', 'author', 'description'] as const)
    .filter((field) => !metadata[field])
  if (missing.length) {
    return NextResponse.json(
      { error: `config.lua is missing: ${missing.join(', ')}` },
      { status: 400 },
    )
  }

  try {
    assertPackageMatches(publisher, metadata.mpackage)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof PublisherError ? error.message : 'Package mismatch' },
      { status: 403 },
    )
  }

  // ---- 4. Do not publish over somebody else's package --------------------
  // The registry already binds this workflow to this package name, but the
  // index is what the world reads: if a package of this name is already there
  // under a different author, the registry entry and reality disagree and a
  // human needs to look rather than one of them silently winning.
  const filename = publisher.filename
  let existingFilename: string | null = null
  try {
    const packages = await fetchRepositoryPackages()
    const existing = packages.find(
      (pkg) => (pkg.mpackage || '').trim().toLowerCase() === publisher.mpackage.trim().toLowerCase(),
    )
    if (existing) {
      if ((existing.author || '').trim().toLowerCase() !== (metadata.author || '').trim().toLowerCase()) {
        return NextResponse.json(
          {
            error:
              `"${publisher.mpackage}" is published by "${existing.author}", but this ` +
              `upload is authored by "${metadata.author}"`,
          },
          { status: 409 },
        )
      }
      existingFilename = existing.filename
    }
  } catch (error) {
    console.error('Trusted publishing: could not read the package index', error)
    return NextResponse.json({ error: 'Could not read the package index' }, { status: 503 })
  }

  // ---- 5. Same landing path as a website upload --------------------------
  const runUrl = `https://github.com/${claims.repository}/actions/runs/${claims.run_id}`
  const branchName = `trusted-publish/${publisher.mpackage
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)}-${metadata.version}-${claims.run_id}-${claims.run_attempt}`

  // Whether this request is the one that made the branch, and so the only one
  // entitled to take it away again on the way out.
  let ownsBranch = false

  try {
    try {
      await createBranch(branchName, 'main')
      ownsBranch = true
    } catch (error) {
      // The name is derived from the run, so the only thing that already holds
      // it is another request for this same run - a replayed token, or a
      // duplicate call - which is partway through building it right now. That
      // publish owns the branch and its pull request; say so and leave.
      const status =
        typeof error === 'object' && error && 'status' in error ? error.status : null
      if (status === 422) {
        return NextResponse.json(
          { error: 'A publish for this workflow run is already in progress' },
          { status: 409 },
        )
      }
      throw error
    }

    // A renamed file would otherwise leave the old one behind as a second copy.
    if (existingFilename && existingFilename !== filename) {
      const oldSha = await getFileSha(`packages/${existingFilename}`)
      if (oldSha) {
        await deleteFile(
          `packages/${existingFilename}`,
          `Delete old version: ${existingFilename}`,
          oldSha,
          branchName,
        )
      }
    }

    await uploadFile(
      `packages/${filename}`,
      fileBuffer.toString('base64'),
      branchName,
      existingFilename ? `Update package: ${filename}` : `Add package: ${filename}`,
    )

    // Pin the provenance to these exact bytes. Anything that replaces the
    // archive later - a website upload, a hand-written pull request, a direct
    // commit - leaves this digest describing a file that is no longer there,
    // and the site stops showing the package as CI-published. See provenance.ts.
    const record: ProvenanceRecord = {
      filename,
      mpackage: publisher.mpackage,
      sha256: sha256(fileBuffer),
      version: metadata.version as string,
      repository: claims.repository,
      repositoryId: claims.repository_id,
      workflow: publisher.workflow,
      ref: claims.ref,
      commit: claims.sha,
      runId: claims.run_id,
      publishedAt: new Date().toISOString(),
    }

    // One file per package: two packages publishing at the same time would
    // otherwise be editing one shared file on two branches cut from the same
    // commit, and whichever merged second would land in conflict.
    const provenancePath = provenancePathFor(filename)
    await uploadFile(
      provenancePath,
      Buffer.from(serialiseRecord(record), 'utf8').toString('base64'),
      branchName,
      `Record provenance for ${filename} ${metadata.version}`,
      (await getFileSha(provenancePath)) ?? undefined,
    )

    // A renamed package must not leave its old record behind vouching for a
    // file that is no longer published.
    if (existingFilename && existingFilename !== filename) {
      const stalePath = provenancePathFor(existingFilename)
      const staleSha = await getFileSha(stalePath)
      if (staleSha) {
        await deleteFile(stalePath, `Remove provenance for ${existingFilename}`, staleSha, branchName)
      }
    }

    const pr = await createPullRequest(
      branchName,
      `${existingFilename ? 'Update' : 'Add'} package: ${filename} (${metadata.version})`,
      [
        `Published by a trusted workflow - no human uploaded this.`,
        ``,
        `- Package: ${metadata.mpackage}`,
        `- Version: ${metadata.version}`,
        `- Author: ${metadata.author}`,
        `- Repository: [${claims.repository}](https://github.com/${claims.repository})`,
        `- Workflow: \`${claims.job_workflow_ref}\``,
        `- Commit: [\`${claims.sha.slice(0, 7)}\`](https://github.com/${claims.repository}/commit/${claims.sha})`,
        `- Run: ${runUrl}`,
        ``,
        `Authorised by the \`${publisher.mpackage}\` entry in [\`${REGISTRY_PATH}\`](../blob/main/${REGISTRY_PATH}).`,
        ``,
        `---`,
        metadata.description,
      ].join('\n'),
    )

    return NextResponse.json({
      success: true,
      pullRequest: pr.data.html_url,
      filename,
      version: metadata.version,
    })
  } catch (error) {
    console.error('Trusted publishing: GitHub API error', error)
    // Leave nothing half-done behind. A branch with commits but no pull request
    // is invisible to every gate here, and the retry derives the same name from
    // the same run, so it would collide with the wreckage instead of starting
    // clean. Only ever the branch this request created, though: the name is
    // shared by every request for this run, and tidying away one that another
    // request is still building would break its pull request rather than clean
    // up after this one. Best-effort - a branch that cannot be removed is not
    // worth failing over, since the response is already an error.
    if (ownsBranch) {
      await deleteBranch(branchName)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create the pull request' },
      { status: 500 },
    )
  }
}
