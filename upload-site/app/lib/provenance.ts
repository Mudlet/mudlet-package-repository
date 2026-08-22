import { createHash } from 'crypto'
import { existsSync, promises as fs } from 'fs'
import path from 'path'
import { RAW_BASE } from './urls'

/**
 * What is actually known about where a published archive came from.
 *
 * This is deliberately not the same thing as trusted-publishers.json. That file
 * says which workflow is *allowed* to publish a package - an intention, decided
 * before any archive exists. It cannot say how the file now sitting in
 * packages/ got there, and a package with an entry can still be replaced by a
 * website upload or an ordinary fork-and-pull-request. A badge driven by the
 * registry would keep vouching for the origin of a file nobody checked.
 *
 * So provenance is recorded per artifact, at the moment the publish endpoint
 * accepts one, and pinned to the bytes it accepted. Anything that later
 * replaces those bytes - by any route, including a maintainer committing
 * directly - changes the digest, the record stops matching, and the badge
 * disappears on its own. It fails closed and needs nobody to remember to
 * revoke it.
 *
 * One file per package, rather than one registry for all of them: two packages
 * publishing at once would otherwise be editing the same file on two branches
 * cut from the same commit, and the second to merge would land in conflict.
 * Sharded, concurrent publishes never touch the same path.
 */

export const PROVENANCE_DIR = 'provenance'

/** provenance/<the file in packages/>.json - e.g. provenance/arkadia.mpackage.json */
export function provenancePathFor(filename: string): string {
  return `${PROVENANCE_DIR}/${filename}.json`
}

export interface ProvenanceRecord {
  /** The file in packages/ this describes. */
  filename: string
  /** Package name from config.lua, for display. */
  mpackage: string
  /** Hex sha-256 of the exact archive that was published. The whole point. */
  sha256: string
  version: string
  /** "owner/repo" the OIDC token was issued to. */
  repository: string
  /** Numeric repository id - what the token was actually matched on. */
  repositoryId: string
  /** Repo-relative workflow file that published it. */
  workflow: string
  /** Ref the publishing run was on, e.g. "refs/heads/main". */
  ref: string
  /** Commit the run was building. */
  commit: string
  runId: string
  publishedAt: string
}

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function serialiseRecord(record: ProvenanceRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`
}

const localProvenanceDir = path.join(process.cwd(), '..', PROVENANCE_DIR)

/**
 * Read one package's record: the checkout during the build, the published copy
 * at request time. A package with no record is the normal case, not an error.
 */
async function loadRecord(filename: string): Promise<ProvenanceRecord | null> {
  try {
    let raw: string | null
    if (existsSync(localProvenanceDir)) {
      const file = path.join(localProvenanceDir, `${filename}.json`)
      if (!existsSync(file)) return null
      raw = await fs.readFile(file, 'utf8')
    } else {
      const url = `${RAW_BASE}/${PROVENANCE_DIR}/${encodeURIComponent(`${filename}.json`)}`
      const response = await fetch(url)
      raw = response.ok ? await response.text() : null
    }
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.sha256 === 'string' ? (parsed as ProvenanceRecord) : null
  } catch {
    // A package page is worth rendering without its provenance panel.
    return null
  }
}

/**
 * The provenance of the archive as it stands right now, or null.
 *
 * `archive` must be the bytes currently published under `filename`. A record
 * that does not match them is not stale metadata to be shown with a caveat -
 * it describes a different file, so it says nothing about this one.
 */
export async function verifiedProvenance(
  filename: string | null,
  archive: Buffer,
): Promise<ProvenanceRecord | null> {
  if (!filename) return null
  const record = await loadRecord(filename)
  if (!record?.sha256) return null
  return record.sha256.toLowerCase() === sha256(archive) ? record : null
}
