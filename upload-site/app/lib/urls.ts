import { PackageMetadata } from './types'

export const RAW_BASE =
  'https://raw.githubusercontent.com/Mudlet/mudlet-package-repository/refs/heads/main'

/**
 * URL-safe identifier for a package, used as the /packages/[name] segment.
 * Package names contain spaces, commas and even slashes, so they cannot be
 * used verbatim in a path segment. Verified collision-free across the current
 * index; lookups fall back to a 404 if a future name ever collides.
 */
export function packageSlug(name: string | null): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function packageDownloadUrl(filename: string | null): string {
  return `${RAW_BASE}/packages/${encodeURIComponent(filename || '')}`
}

/**
 * `icon` in the index is a repo-relative path written by reindex.lua, which
 * already percent-encodes everything except spaces (see its urlEncode).
 * So only spaces need escaping here - running encodeURI over it would
 * double-encode the escapes it already contains.
 */
export function packageIconUrl(icon: string | null): string | null {
  if (!icon) return null
  return `${RAW_BASE}/${icon.replace(/ /g, '%20')}`
}

export function packageHref(pkg: PackageMetadata): string {
  return `/packages/${packageSlug(pkg.mpackage)}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

export function formatDate(value: string | number | null): string | null {
  if (!value) return null
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
