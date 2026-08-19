import AdmZip from 'adm-zip'
import { fetchPackageArchive } from './packages'

/**
 * Reading one file out of a package means having the whole archive, and the
 * biggest ones run to tens of megabytes - so archives are kept around briefly
 * in memory, keyed by filename.
 */
const MAX_CACHE_BYTES = 96 * 1024 * 1024
/**
 * A new version of a package is published under the same filename, and nothing
 * here observes that happening - so entries have to lapse on their own or a
 * warm one would keep serving the previous archive for as long as the process
 * lives.
 */
const MAX_CACHE_AGE_MS = 5 * 60 * 1000

interface CacheEntry {
  buffer: Buffer
  storedAt: number
}

const cache = new Map<string, CacheEntry>()
let cachedBytes = 0

function forget(filename: string, entry: CacheEntry) {
  cache.delete(filename)
  cachedBytes -= entry.buffer.length
}

export async function getArchiveBuffer(filename: string): Promise<Buffer> {
  const cached = cache.get(filename)
  if (cached) {
    if (Date.now() - cached.storedAt < MAX_CACHE_AGE_MS) {
      // Re-insert so the most recently used entry is evicted last.
      cache.delete(filename)
      cache.set(filename, cached)
      return cached.buffer
    }
    forget(filename, cached)
  }

  const buffer = await fetchPackageArchive(filename)
  cache.set(filename, { buffer, storedAt: Date.now() })
  cachedBytes += buffer.length

  while (cachedBytes > MAX_CACHE_BYTES && cache.size > 1) {
    const oldest = cache.keys().next().value as string
    const entry = cache.get(oldest)
    if (entry) forget(oldest, entry)
    else cache.delete(oldest)
  }

  return buffer
}

/**
 * Budget for the small fixed files a package describes itself with - config.lua
 * and its icon. Both are tiny in any real package, and both are read straight
 * from an upload, before anything has vouched for it.
 */
export const MAX_METADATA_BYTES = 2 * 1024 * 1024

/**
 * Expand one entry of an already-open archive, or null when it is missing, a
 * directory, or larger uncompressed than maxBytes. Same reasoning as
 * readPackageEntry: the header size decides, so an over-compressed entry never
 * reaches getData().
 */
export function readEntryWithin(
  entry: AdmZip.IZipEntry | null,
  maxBytes: number
): Buffer | null {
  if (!entry || entry.isDirectory || entry.header.size > maxBytes) return null
  return entry.getData()
}

export interface PackageEntryData {
  /** Null when the entry is over maxBytes, in which case it is never expanded. */
  data: Buffer | null
  size: number
}

/**
 * Read a single entry out of a package archive, or null if it is not there.
 *
 * Deflate reaches compression ratios in the thousands, so the size of the
 * archive says nothing about what expanding one entry costs. The zip header
 * records the uncompressed size, so an oversized - or deliberately
 * over-compressed - entry is turned away before getData() unpacks it.
 */
export async function readPackageEntry(
  filename: string,
  entryPath: string,
  maxBytes = Number.POSITIVE_INFINITY
): Promise<PackageEntryData | null> {
  const zip = new AdmZip(await getArchiveBuffer(filename))
  const entry = zip.getEntry(entryPath)
  if (!entry || entry.isDirectory) return null

  const size = entry.header.size
  if (size > maxBytes) return { data: null, size }

  return { data: entry.getData(), size }
}
