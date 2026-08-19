import AdmZip from 'adm-zip'
import { fetchPackageArchive } from './packages'

/**
 * Reading one file out of a package means having the whole archive, and the
 * biggest ones run to tens of megabytes - so archives are kept around briefly
 * in memory, keyed by filename. Packages are replaced rather than edited in
 * place, so a stale entry can only appear right after an upload lands.
 */
const MAX_CACHE_BYTES = 96 * 1024 * 1024
const cache = new Map<string, Buffer>()
let cachedBytes = 0

export async function getArchiveBuffer(filename: string): Promise<Buffer> {
  const cached = cache.get(filename)
  if (cached) {
    // Re-insert so the most recently used entry is evicted last.
    cache.delete(filename)
    cache.set(filename, cached)
    return cached
  }

  const buffer = await fetchPackageArchive(filename)
  cache.set(filename, buffer)
  cachedBytes += buffer.length

  while (cachedBytes > MAX_CACHE_BYTES && cache.size > 1) {
    const oldest = cache.keys().next().value as string
    cachedBytes -= cache.get(oldest)?.length ?? 0
    cache.delete(oldest)
  }

  return buffer
}

export interface PackageEntryData {
  data: Buffer
  size: number
}

/** Read a single entry out of a package archive, or null if it is not there. */
export async function readPackageEntry(
  filename: string,
  entryPath: string
): Promise<PackageEntryData | null> {
  const zip = new AdmZip(await getArchiveBuffer(filename))
  const entry = zip.getEntry(entryPath)
  if (!entry || entry.isDirectory) return null

  const data = entry.getData()
  return { data, size: entry.header.size }
}
