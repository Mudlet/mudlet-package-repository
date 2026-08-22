/** One name, with how far it reaches across the repository. */
export interface ApiUsageEntry {
  name: string
  /** Mudlet's own signature for the function; absent for namespaced calls. */
  signature?: string
  /** Where the wiki documents it, anchored at the function itself. */
  url: string | null
  packages: number
  calls: number
}

export interface ApiUsageFunction {
  name: string
  signature?: string
  url: string | null
}

export interface ApiUsagePackage {
  name: string
  slug: string
  /** How many distinct Mudlet API functions the package calls. */
  functions: number
  calls: number
  top: string[]
  shipsLuaFiles: boolean
}

export interface ApiUsageReport {
  generatedAt: string
  source: string
  packagesScanned: number
  apiFunctionCount: number
  /** Of the functions used, how many come from Mudlet's published list. */
  listedFunctionsUsed: number
  /** Lua scanned, after comments and string contents were stripped out. */
  luaBytes: number
  /** How much of that came from .lua files shipped alongside the XML. */
  luaFileBytes: number
  functions: ApiUsageEntry[]
  unused: ApiUsageFunction[]
  beyond: ApiUsageEntry[]
  packages: ApiUsagePackage[]
  skipped: { filename: string; reason: string }[]
}

/**
 * Where to send someone who clicks a name. The scan resolves this against the
 * wiki's own anchors, so it lands on the function itself; only the calls Mudlet
 * does not document - third-party libraries, mostly - fall back to a search.
 */
export function documentationUrl(entry: { name: string; url?: string | null }): string {
  return (
    entry.url ?? `https://wiki.mudlet.org/index.php?search=${encodeURIComponent(entry.name)}`
  )
}
