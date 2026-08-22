import { getFileContent } from './github'
import type { ActionsClaims } from './oidc'

/**
 * The trusted publisher registry: which GitHub Actions workflow, if any, is
 * allowed to publish a given package without a human driving the upload.
 *
 * The registry lives in trusted-publishers.json at the root of this repository,
 * so adding a publisher is an ordinary pull request and a maintainer reviewing
 * it *is* the authorization step. Nothing else grants publish rights, and a
 * package with no entry here can only be uploaded the usual way.
 */

export const REGISTRY_PATH = 'trusted-publishers.json'

export interface TrustedPublisher {
  /** The `mpackage` name in the package's config.lua. Compared case-insensitively. */
  mpackage: string
  /** File the package lands on as packages/<filename>. */
  filename: string
  /** "owner/repo", for humans reading the file and for error messages. */
  repository: string
  /**
   * GitHub's numeric ids. These are what a token is actually matched against:
   * a repository or account can be renamed, transferred, deleted and recreated
   * by someone else, and every one of those keeps the old "owner/repo" string
   * working while pointing somewhere new. The ids do not move.
   */
  repositoryId: string
  repositoryOwnerId: string
  /**
   * Repo-relative path of the workflow allowed to publish, e.g.
   * ".github/workflows/publish.yml". Matched against the token's
   * job_workflow_ref, so it pins the actual file the job came from - without
   * it, *any* workflow anyone can land in that repository could publish.
   */
  workflow: string
  /** Optional: require the run to be on this exact ref, e.g. "refs/heads/main". */
  ref?: string | null
  /**
   * Optional: require the job to run in this GitHub environment. An environment
   * with required reviewers turns publishing into something a human approves.
   */
  environment?: string | null
  /** Self-hosted runners are outside GitHub's control; opt in deliberately. */
  allowSelfHostedRunner?: boolean
}

interface Registry {
  publishers: TrustedPublisher[]
}

export class PublisherError extends Error {}

function parseRegistry(raw: string): TrustedPublisher[] {
  let parsed: Registry
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new PublisherError('the trusted publisher registry is not valid JSON')
  }
  if (!parsed || !Array.isArray(parsed.publishers)) {
    throw new PublisherError('the trusted publisher registry has no "publishers" array')
  }
  return parsed.publishers
}

/**
 * Read through the GitHub API rather than raw.githubusercontent.com: raw is
 * behind a CDN with minutes of caching, and minutes is exactly the window in
 * which a revoked publisher would still be able to publish.
 */
export async function loadRegistry(): Promise<TrustedPublisher[]> {
  const raw = await getFileContent(REGISTRY_PATH)
  if (raw === null) return []
  return parseRegistry(raw)
}

/**
 * job_workflow_ref is "owner/repo/.github/workflows/file.yml@refs/heads/main".
 * The ref is checked separately, so only the path half is compared here.
 */
function workflowPathOf(jobWorkflowRef: string): string | null {
  const at = jobWorkflowRef.lastIndexOf('@')
  if (at === -1) return null
  return jobWorkflowRef.slice(0, at)
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Finds the registry entry that authorises this run, or explains why none did.
 *
 * The explanation deliberately does not distinguish "no entry for this
 * repository" from "entry exists but the workflow differs" in a way that would
 * let someone enumerate the registry - the registry is a public file in this
 * repository, so there is nothing to hide, but the message stays about the
 * caller's own token rather than about what else is registered.
 */
export function authorise(
  claims: ActionsClaims,
  publishers: TrustedPublisher[],
): TrustedPublisher {
  const forRepo = publishers.filter(
    (p) =>
      p.repositoryId === claims.repository_id &&
      p.repositoryOwnerId === claims.repository_owner_id,
  )

  if (forRepo.length === 0) {
    throw new PublisherError(
      `no trusted publisher is registered for repository ${claims.repository} ` +
        `(id ${claims.repository_id}). Open a pull request adding one to ${REGISTRY_PATH}.`,
    )
  }

  const path = workflowPathOf(claims.job_workflow_ref)
  if (!path) {
    throw new PublisherError('the token\'s job_workflow_ref claim is malformed')
  }

  // Built from the token's own repository name, not the registry's copy of it.
  // Which repository this is has already been settled by the ids above, and the
  // name in the registry is only a label for people reading the file - it goes
  // stale the moment the repository is renamed or transferred, and comparing
  // against it would then reject every publish from the very workflow the entry
  // exists to authorise. What is actually being pinned here is the workflow path.
  const match = forRepo.find((p) => sameName(path, `${claims.repository}/${p.workflow}`))
  if (!match) {
    throw new PublisherError(
      `workflow ${path} is not the workflow registered to publish for this repository`,
    )
  }

  if (match.ref && match.ref !== claims.ref) {
    throw new PublisherError(
      `this publisher may only publish from ${match.ref}, the run was on ${claims.ref}`,
    )
  }

  if (match.environment && match.environment !== claims.environment) {
    throw new PublisherError(
      `this publisher must run in the '${match.environment}' environment` +
        (claims.environment ? `, the run used '${claims.environment}'` : ', the run declared none'),
    )
  }

  if (claims.runner_environment !== 'github-hosted' && !match.allowSelfHostedRunner) {
    throw new PublisherError(
      'this publisher is not permitted to publish from a self-hosted runner',
    )
  }

  return match
}

/**
 * The package being uploaded has to be the package the entry is for. Without
 * this an authorised workflow could publish over anything in the repository.
 */
export function assertPackageMatches(
  publisher: TrustedPublisher,
  mpackage: string | null,
): void {
  if (!mpackage || !sameName(mpackage, publisher.mpackage)) {
    throw new PublisherError(
      `config.lua declares mpackage "${mpackage ?? ''}", but this publisher is ` +
        `registered for "${publisher.mpackage}"`,
    )
  }
}

/** Guards against an entry naming a path instead of a file in packages/. */
export function assertFilenameSane(filename: string): void {
  if (!/^[^/\\]+\.(mpackage|zip)$/i.test(filename)) {
    throw new PublisherError(
      `registered filename "${filename}" is not a plain .mpackage or .zip file name`,
    )
  }
}
