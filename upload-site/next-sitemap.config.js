const fs = require('fs')
const path = require('path')

function getPathsFromDir(dir) {
  const paths = []
  const items = fs.readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    if (item.isDirectory()) {
      // Skip api, lib, components folders
      if (['api', 'lib', 'components'].includes(item.name)) continue
      // Skip folders starting with [ or ( (dynamic/group routes)
      if (item.name.startsWith('[') || item.name.startsWith('(')) continue

      const fullPath = path.join(dir, item.name)
      paths.push('/' + item.name)
      // Recursively get paths from subdirectories
      paths.push(...getPathsFromDir(fullPath).map(p => `/${item.name}${p}`))
    }
  }
  return paths
}

/**
 * The package index, or nothing: sitemap generation must not fail a build if it
 * is unavailable. Same checkout the site itself builds from - see
 * fetchRepositoryPackages in app/lib/packages.ts.
 */
function readPackageIndex() {
  try {
    const indexPath = path.join(process.cwd(), '..', 'packages', 'mpkg.packages.json')
    return JSON.parse(fs.readFileSync(indexPath, 'utf8')).packages
  } catch {
    return []
  }
}

/** Must stay in step with packageSlug() in app/lib/urls.ts. */
const packageSlug = (name) =>
  (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** reindex.lua writes `uploaded` as a unix timestamp in seconds. */
function uploadedAt(pkg) {
  const seconds = Number(pkg && pkg.uploaded)
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  const date = new Date(seconds * 1000)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://packages.mudlet.org',
  generateRobotsTxt: true,
  outDir: './public',
  // Otherwise next-sitemap backfills build time onto any entry that leaves
  // lastmod out, which is the churn this config is trying to stop.
  autoLastmod: false,
  additionalPaths: async () => {
    const packages = readPackageIndex()

    /**
     * lastmod used to be `new Date()` on every URL, which told crawlers the
     * whole site had changed on every deploy - and deploys happen on any merge,
     * including ones that touch nothing a crawler cares about. The index
     * carries a real timestamp per package, so each package page can date
     * itself, and a page that lists packages is as new as the newest one it
     * lists. Anything else here is a hand-written page whose date this file has
     * no honest way to know, so it gets no lastmod at all - the sitemap spec
     * makes it optional, and omitting it beats inventing it.
     */
    const uploads = packages.map(uploadedAt).filter(Boolean).sort()
    const newestUpload = uploads.length ? uploads[uploads.length - 1] : undefined

    const listingPages = new Set(['/', '/packages'])

    // Per-package detail pages live under the dynamic [name] route, which the
    // directory walk deliberately skips, so list them from the index.
    const packagePaths = packages
      .map((pkg) => ({ loc: `/packages/${packageSlug(pkg.mpackage)}`, lastmod: uploadedAt(pkg) }))
      .filter((entry) => entry.loc !== '/packages/')

    const staticPaths = ['/', ...getPathsFromDir(path.join(process.cwd(), 'app'))].map((loc) => ({
      loc,
      lastmod: listingPages.has(loc) ? newestUpload : undefined,
    }))

    return [...staticPaths, ...packagePaths].map((entry) => ({
      loc: entry.loc,
      ...(entry.lastmod ? { lastmod: entry.lastmod } : {}),
    }))
  },
}
