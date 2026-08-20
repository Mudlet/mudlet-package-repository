import { existsSync, promises as fs } from 'fs'
import path from 'path'
import { UploadedPackageMetadata } from './types'
import { RAW_BASE, packageDownloadUrl, packageSlug } from './urls'

const INDEX_URL = `${RAW_BASE}/packages/mpkg.packages.json`

/**
 * The site is deployed out of the package repository itself, so the index and
 * the archives sit one directory up from the Next.js root - during the Vercel
 * build just as much as in dev. Reading them off disk is what lets package
 * pages prerender (see generateStaticParams in app/packages/[name]/page.tsx),
 * and it also stops a deploy triggered by a package merge from building
 * against a CDN-stale copy of the index.
 *
 * The checkout is not traced into the serverless output - it is over 100 MB of
 * archives - so at request time this directory is absent and every read below
 * falls back to the network on its own.
 */
const localPackagesDir = path.join(process.cwd(), '..', 'packages')

/** Whether this process can see the repository checkout. Build time: yes. */
export const readsFromCheckout = existsSync(localPackagesDir)

export async function fetchRepositoryPackages(): Promise<UploadedPackageMetadata[]> {
  if (readsFromCheckout) {
    try {
      const jsonData = await fs.readFile(
        path.join(localPackagesDir, 'mpkg.packages.json'),
        'utf8'
      )
      return JSON.parse(jsonData).packages
    } catch {
      // A checkout without a generated index still gets a working site.
    }
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

/** Read the .mpackage archive itself so its contents can be listed. */
export async function fetchPackageArchive(filename: string): Promise<Buffer> {
  if (readsFromCheckout) {
    try {
      // The index is repository-controlled, but packageDownloadUrl already
      // treats this value as a flat filename (encodeURIComponent escapes any
      // slash), so it must not address anything outside the directory here
      // either.
      return await fs.readFile(path.join(localPackagesDir, path.basename(filename)))
    } catch {
      // The index can name an archive a stale checkout does not have yet.
    }
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
