import { promises as fs } from 'fs'
import path from 'path'
import { UploadedPackageMetadata } from './types'
import { RAW_BASE, packageDownloadUrl, packageSlug } from './urls'

const INDEX_URL = `${RAW_BASE}/packages/mpkg.packages.json`

/** In dev the repository checkout sits one level up, so read it straight off disk. */
const isDev = process.env.NODE_ENV === 'development'
const localRepoPath = (...parts: string[]) => path.join(process.cwd(), '..', ...parts)

export async function fetchRepositoryPackages(): Promise<UploadedPackageMetadata[]> {
  if (isDev) {
    const jsonData = await fs.readFile(localRepoPath('packages', 'mpkg.packages.json'), 'utf8')
    return JSON.parse(jsonData).packages
  }

  const response = await fetch(INDEX_URL, { next: { revalidate: 600 } })
  if (!response.ok) {
    throw new Error(`Could not load the package index (HTTP ${response.status})`)
  }
  const data = await response.json()
  return data.packages
}

export async function fetchPackageBySlug(slug: string): Promise<UploadedPackageMetadata | null> {
  const packages = await fetchRepositoryPackages()
  return packages.find((pkg) => packageSlug(pkg.mpackage) === slug) ?? null
}

/** Download the .mpackage archive itself so its contents can be listed. */
export async function fetchPackageArchive(filename: string): Promise<Buffer> {
  if (isDev) {
    return fs.readFile(localRepoPath('packages', filename))
  }

  // Archives run to tens of megabytes, past the data cache entry limit, so most
  // of these are not actually cached - what matters is that the request stays
  // *cacheable*: `no-store` here would mark the whole package page dynamic and
  // break its ISR render (DYNAMIC_SERVER_USAGE).
  const response = await fetch(packageDownloadUrl(filename), {
    next: { revalidate: 86400 },
  })
  if (!response.ok) {
    throw new Error(`Could not download ${filename} (HTTP ${response.status})`)
  }
  return Buffer.from(await response.arrayBuffer())
}
