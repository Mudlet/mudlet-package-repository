#!/usr/bin/env node
/**
 * Checks trusted-publishers.json.
 *
 * An entry in that file grants a workflow the right to publish a package, so a
 * typo in it is a security-relevant mistake rather than a cosmetic one: an id
 * that belongs to the wrong repository hands publish rights to whoever owns
 * that repository. This verifies the shape of every entry and confirms each
 * pair of ids really is the repository the entry names.
 *
 * Usage: node .github/scripts/validate-trusted-publishers.mjs [path]
 * Set GITHUB_TOKEN to avoid the unauthenticated API rate limit.
 */

import { readFile } from 'node:fs/promises'

const path = process.argv[2] ?? 'trusted-publishers.json'
const problems = []
const note = (entry, message) =>
  problems.push(`${entry === null ? path : `${path} [${entry}]`}: ${message}`)

const raw = await readFile(path, 'utf8').catch((error) => {
  console.error(`cannot read ${path}: ${error.message}`)
  process.exit(1)
})

let registry
try {
  registry = JSON.parse(raw)
} catch (error) {
  console.error(`${path} is not valid JSON: ${error.message}`)
  process.exit(1)
}

if (!registry || !Array.isArray(registry.publishers)) {
  console.error(`${path} has no "publishers" array`)
  process.exit(1)
}

const REQUIRED = ['mpackage', 'filename', 'repository', 'repositoryId', 'repositoryOwnerId', 'workflow']
const KNOWN = new Set([...REQUIRED, 'ref', 'environment', 'allowSelfHostedRunner'])

const seen = new Map()

for (const [index, entry] of registry.publishers.entries()) {
  const label = entry?.mpackage ? `${index}: ${entry.mpackage}` : String(index)

  if (typeof entry !== 'object' || entry === null) {
    note(label, 'is not an object')
    continue
  }

  for (const field of REQUIRED) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) {
      note(label, `"${field}" must be a non-empty string`)
    }
  }
  for (const key of Object.keys(entry)) {
    if (!KNOWN.has(key)) note(label, `unknown key "${key}"`)
  }
  if ('allowSelfHostedRunner' in entry && typeof entry.allowSelfHostedRunner !== 'boolean') {
    note(label, '"allowSelfHostedRunner" must be a boolean')
  }

  if (typeof entry.repository === 'string' && !/^[^/\s]+\/[^/\s]+$/.test(entry.repository)) {
    note(label, `"repository" should be "owner/repo", got "${entry.repository}"`)
  }
  for (const field of ['repositoryId', 'repositoryOwnerId']) {
    if (typeof entry[field] === 'string' && !/^\d+$/.test(entry[field])) {
      note(label, `"${field}" must be GitHub's numeric id as a string`)
    }
  }
  if (typeof entry.filename === 'string' && !/^[^/\\]+\.(mpackage|zip)$/i.test(entry.filename)) {
    note(label, `"filename" must be a plain .mpackage or .zip file name, got "${entry.filename}"`)
  }
  if (typeof entry.workflow === 'string' && !/^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry.workflow)) {
    note(label, `"workflow" must be a path like ".github/workflows/publish.yml", got "${entry.workflow}"`)
  }
  if (entry.ref != null && typeof entry.ref === 'string' && !entry.ref.startsWith('refs/')) {
    note(label, `"ref" must be a full ref such as "refs/heads/main", got "${entry.ref}"`)
  }

  // Two entries for one package name would make authorisation order-dependent.
  if (typeof entry.mpackage === 'string') {
    const key = entry.mpackage.trim().toLowerCase()
    if (seen.has(key)) {
      note(label, `duplicates the entry at index ${seen.get(key)} for the same package`)
    } else {
      seen.set(key, index)
    }
  }
}

// The ids are the thing actually matched, so confirm they are the repository
// the entry claims. A mismatch means the entry grants rights to someone else.
const headers = { accept: 'application/vnd.github+json' }
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`

for (const [index, entry] of registry.publishers.entries()) {
  if (typeof entry?.repository !== 'string' || typeof entry?.repositoryId !== 'string') continue
  const label = `${index}: ${entry.mpackage ?? '?'}`

  let response
  try {
    response = await fetch(`https://api.github.com/repos/${entry.repository}`, { headers })
  } catch (error) {
    note(label, `could not reach the GitHub API: ${error.message}`)
    continue
  }

  if (response.status === 404) {
    note(label, `repository ${entry.repository} does not exist or is private`)
    continue
  }
  if (!response.ok) {
    note(label, `GitHub API returned HTTP ${response.status} for ${entry.repository}`)
    continue
  }

  const repo = await response.json()
  if (String(repo.id) !== entry.repositoryId) {
    note(label, `repositoryId is ${entry.repositoryId} but ${entry.repository} is ${repo.id}`)
  }
  if (String(repo.owner?.id) !== entry.repositoryOwnerId) {
    note(label, `repositoryOwnerId is ${entry.repositoryOwnerId} but ${repo.owner?.login} is ${repo.owner?.id}`)
  }
}

if (problems.length) {
  console.error(`${problems.length} problem(s) found:\n`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`${path}: ${registry.publishers.length} publisher(s), all valid`)
