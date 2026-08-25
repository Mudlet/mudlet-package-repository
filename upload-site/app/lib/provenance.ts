import { createHash } from 'crypto'
import { existsSync, promises as fs } from 'fs'
import path from 'path'
import { readsFromCheckout } from './packages'
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
 * Every field the record is written with, and every field a reader may reach
 * for without checking first. A record short of any of them was not written by
 * the publish endpoint, and the digest matching says nothing about the rest of
 * it - the panel dereferences `commit` and `workflow`, so a record carrying
 * only a sha256 would throw during the render of a page that has no business
 * failing over its provenance panel.
 */
const RECORD_FIELDS = [
  'filename',
  'mpackage',
  'sha256',
  'version',
  'repository',
  'repositoryId',
  'workflow',
  'ref',
  'commit',
  'runId',
  'publishedAt',
] as const

function isRecord(value: unknown): value is ProvenanceRecord {
  if (!value || typeof value !== 'object') return false
  const fields = value as Record<string, unknown>
  return RECORD_FIELDS.every((field) => typeof fields[field] === 'string' && fields[field] !== '')
}

/**
 * Read one package's record: the checkout during the build, the published copy
 * at request time. A package with no record is the normal case, not an error.
 *
 * Which of the two is decided by whether the checkout is there at all, not by
 * whether it holds a provenance directory. Before the first trusted publish
 * there is no such directory, and reading its absence as "ask the network" had
 * the build fetch a 404 for every package it prerendered.
 */
async function loadRecord(filename: string): Promise<ProvenanceRecord | null> {
  try {
    let raw: string | null
    if (readsFromCheckout) {
      const file = path.join(localProvenanceDir, `${filename}.json`)
      if (!existsSync(file)) return null
      raw = await fs.readFile(file, 'utf8')
    } else {
      const url = `${RAW_BASE}/${PROVENANCE_DIR}/${encodeURIComponent(`${filename}.json`)}`
      const response = await fetch(url)
      raw = response.ok ? await response.text() : null
    }
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? parsed : null
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
