/**
 * Counts Mudlet API usage across every package in the repository and writes the
 * result to app/lib/generated/api-usage.json, which the /stats page renders.
 *
 * Runs as prebuild/predev rather than inside a page render: the package pages
 * already unpack every archive once each to list their contents, and doing a
 * second full pass per render would double that. One pass here, one JSON file,
 * and the page is a static import of the answer.
 *
 * The list of what counts as "the Mudlet API" is downloaded rather than kept in
 * this repository - Mudlet regenerates src/lua-function-list.json from the wiki
 * every Friday for its editor autocompletion, so a copy here would silently age
 * out. The download needs no credentials, which is what the build actually
 * relies on (see .github/workflows/build-package-site.yml).
 */
import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const siteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = path.join(siteRoot, '..', 'packages')
const outputPath = path.join(siteRoot, 'app', 'lib', 'generated', 'api-usage.json')

/** Mudlet's own autocompletion list: a flat map of function name -> signature. */
const FUNCTION_LIST_URL =
  'https://raw.githubusercontent.com/Mudlet/Mudlet/development/src/lua-function-list.json'

const WIKI_BASE = 'https://wiki.mudlet.org/w/'

/**
 * Manual pages read for their per-function anchors - the wiki gives every
 * documented function an `id` matching its name, so these say both where a
 * function is documented and, for the namespaced ones, that Mudlet documents it
 * at all. The function list above covers global functions only, which is why
 * Geyser and the additions to table, string and io need a second source.
 *
 * `namespaces` is what a page owns outright: Geyser.HBox has no anchor of its
 * own, but it is Mudlet's and belongs on the Geyser page all the same.
 */
const WIKI_PAGES = [
  { page: 'Manual:Lua_Functions', namespaces: [] },
  { page: 'Manual:Geyser', namespaces: ['Geyser', 'Adjustable'] },
  { page: 'Manual:Database_Functions', namespaces: ['db'] },
]

/** Archives past this are skipped whole, matching the package explorer's cap. */
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024
/** Uncompressed cap per entry; deflate ratios say nothing about what unpacks. */
const MAX_XML_BYTES = 16 * 1024 * 1024
const MAX_LUA_BYTES = 8 * 1024 * 1024
/**
 * Cap on everything one package unpacks to. The per-entry caps above say
 * nothing about the total: an archive well inside MAX_ARCHIVE_BYTES can hold
 * thousands of entries that each pass, and deflate ratios reach the thousands,
 * so the sum is what decides whether a single package can exhaust the build.
 * The largest package here unpacks to 3.7 MB, and the whole repository to 20.
 */
const MAX_PACKAGE_LUA_BYTES = 32 * 1024 * 1024

/** How many "beyond the API" names to keep, and how many packages one needs. */
const MAX_BEYOND_NAMES = 250
const MIN_BEYOND_PACKAGES = 2

/**
 * Lua 5.1's own library, so the "beyond the API" listing is about what package
 * authors reach for *outside* both Lua and the documented Mudlet API. Only the
 * standard members are listed: Mudlet adds its own to table and string
 * (table.save, string.cut ...) and those are exactly what belongs in that list.
 */
const STANDARD_LUA = new Set([
  'assert', 'collectgarbage', 'dofile', 'error', 'getfenv', 'getmetatable',
  'ipairs', 'load', 'loadfile', 'loadstring', 'module', 'next', 'pairs',
  'pcall', 'print', 'rawequal', 'rawget', 'rawlen', 'rawset', 'require',
  'select', 'setfenv', 'setmetatable', 'tonumber', 'tostring', 'type',
  'unpack', 'xpcall',
  'coroutine.create', 'coroutine.resume', 'coroutine.running',
  'coroutine.status', 'coroutine.wrap', 'coroutine.yield',
  'debug.getinfo', 'debug.sethook', 'debug.traceback',
  'io.close', 'io.input', 'io.lines', 'io.open', 'io.output', 'io.popen',
  'io.read', 'io.stderr', 'io.stdout', 'io.write',
  'math.abs', 'math.acos', 'math.asin', 'math.atan', 'math.atan2', 'math.ceil',
  'math.cos', 'math.deg', 'math.exp', 'math.floor', 'math.fmod', 'math.huge',
  'math.log', 'math.log10', 'math.max', 'math.min', 'math.modf', 'math.pi',
  'math.pow', 'math.rad', 'math.random', 'math.randomseed', 'math.sin',
  'math.sqrt', 'math.tan',
  'package.config', 'package.cpath', 'package.loaded', 'package.loadlib',
  'package.path', 'package.preload', 'package.seeall',
  'os.clock', 'os.date', 'os.difftime', 'os.execute', 'os.exit', 'os.getenv',
  'os.remove', 'os.rename', 'os.time', 'os.tmpname',
  'string.byte', 'string.char', 'string.find', 'string.format', 'string.gmatch',
  'string.gsub', 'string.len', 'string.lower', 'string.match', 'string.rep',
  'string.reverse', 'string.sub', 'string.upper',
  'table.concat', 'table.getn', 'table.insert', 'table.maxn', 'table.remove',
  'table.setn', 'table.sort',
])

// ---------------------------------------------------------------------------
// Reading Lua out of a package
// ---------------------------------------------------------------------------

/**
 * Scripts sit in the package XML as entity-escaped text, so they are read
 * through the XML parser rather than off the raw source - a script using `<`
 * or `&` arrives as `&lt;` and `&amp;` otherwise.
 */
const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: false,
  parseTagValue: false,
})

/** Every <script> body in the tree, at whatever depth it sits. */
function collectScripts(node, into) {
  if (Array.isArray(node)) {
    for (const child of node) collectScripts(child, into)
    return into
  }
  if (!node || typeof node !== 'object') return into

  for (const [key, value] of Object.entries(node)) {
    if (key === 'script' && typeof value === 'string') into.push(value)
    else collectScripts(value, into)
  }
  return into
}

/**
 * The Lua a package carries: the scripts in its XML, plus any .lua files it
 * ships. 27 packages do ship them - vendored libraries like MDK, Glu and
 * demontools, which run in Mudlet just as much as the XML scripts do.
 */
function readLuaSources(zip) {
  const xmlScripts = []
  const luaFiles = []
  let budget = MAX_PACKAGE_LUA_BYTES
  let truncated = false

  /** Whether an entry fits what is left of the budget, charged against it if so. */
  const affordable = (size, limit) => {
    if (size > limit) return false
    if (size > budget) {
      // Decided from the zip header, so an entry past the budget is never
      // expanded - which is the point: getData() is where the memory goes.
      truncated = true
      return false
    }
    budget -= size
    return true
  }

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    const name = entry.entryName

    if (/^[^/]+\.xml$/i.test(name)) {
      if (!affordable(entry.header.size, MAX_XML_BYTES)) continue
      try {
        const parsed = parser.parse(entry.getData().toString('utf8'))
        collectScripts(parsed?.MudletPackage ?? parsed, xmlScripts)
      } catch {
        // A package whose XML will not parse still has its .lua files read.
      }
      continue
    }

    // config.lua is the package manifest, not code that runs in Mudlet.
    if (/\.lua$/i.test(name) && name !== 'config.lua') {
      if (!affordable(entry.header.size, MAX_LUA_BYTES)) continue
      luaFiles.push(entry.getData().toString('utf8'))
    }
  }

  return { xmlScripts, luaFiles, truncated }
}

// ---------------------------------------------------------------------------
// Lua scanning
// ---------------------------------------------------------------------------

/**
 * Span of a long bracket - [[...]], [=[...]=] and so on - starting at `start`,
 * or null if that is not what starts there. Used for both long strings and
 * long comments, which share the syntax.
 */
function longBracket(source, start) {
  if (source[start] !== '[') return null

  let level = start + 1
  while (source[level] === '=') level += 1
  if (source[level] !== '[') return null

  const close = `]${'='.repeat(level - start - 1)}]`
  const end = source.indexOf(close, level + 1)
  return { end: end === -1 ? source.length : end + close.length }
}

/**
 * Blanks out comments and string contents so that identifiers inside them are
 * not counted - a package that documents `send()` in a comment, or echoes the
 * word "display", should not register as calling either.
 *
 * Strings collapse to an empty literal of the same kind rather than vanishing,
 * because a literal is one of the things that makes a call: `cecho[[...]]` and
 * `send"look"` are calls and have to stay recognisable as such.
 */
function stripLuaNoise(source) {
  let out = ''
  let i = 0

  while (i < source.length) {
    const char = source[i]

    if (char === '-' && source[i + 1] === '-') {
      const long = longBracket(source, i + 2)
      if (long) {
        i = long.end
      } else {
        while (i < source.length && source[i] !== '\n') i += 1
      }
      out += ' '
      continue
    }

    if (char === '[') {
      const long = longBracket(source, i)
      if (long) {
        i = long.end
        out += '[[]]'
        continue
      }
    }

    if (char === '"' || char === "'") {
      i += 1
      while (i < source.length) {
        if (source[i] === '\\') {
          i += 2
          continue
        }
        // An unterminated literal ends at the line, so one bad quote does not
        // swallow the rest of the file.
        if (source[i] === char || source[i] === '\n') {
          i += 1
          break
        }
        i += 1
      }
      out += '""'
      continue
    }

    out += char
    i += 1
  }

  return out
}

/**
 * Names a package installs as globals, which really do replace Mudlet's own for
 * the rest of the session: a package carrying `function display(...)` is not
 * calling Mudlet's display() anywhere, in that file or any other, so these are
 * struck package-wide.
 *
 * `local` declarations and parameters are deliberately not here - they shadow
 * only inside the block that introduces them, and countCalls() tracks that.
 * Folding them in here is what made one `local prefix` in a UI helper discount
 * all 24 prefix() calls elsewhere in the same package.
 */
function globalDefinitions(source) {
  const defined = new Set()

  // The name after `function` even when a field follows it: `function a.b.c()`
  // needs `a` to exist already, so a call to `a(...)` is the package's own.
  for (const match of source.matchAll(/(^|[^\w.:])function\s+([A-Za-z_]\w*)\s*[(.:]/g)) {
    const before = source.slice(Math.max(0, match.index - 6), match.index + match[1].length)
    if (/\blocal\s*$/.test(before)) continue
    defined.add(match[2])
  }
  for (const match of source.matchAll(/^[ \t]*([A-Za-z_]\w*)\s*=\s*function\b/gm)) {
    defined.add(match[1])
  }

  return defined
}

/** Identifiers, including dotted and colon-separated chains. */
const TOKEN = /[A-Za-z_]\w*(?:[.:][A-Za-z_]\w*)*/g

/**
 * Lua's keywords, several of which are followed by a bracket often enough to
 * pass for a call otherwise - `x or (y)`, `return (z)`.
 */
const LUA_KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
  'true', 'until', 'while',
])

/**
 * Whether the identifier is being reached through a value rather than named
 * outright: `label:hide()`, `("x"):gsub()`. The token regex swallows a chain
 * whose parts are all identifiers, so what is left here is a chain hanging off
 * something else - a call, a literal, an index.
 *
 * `..` is concatenation, not indexing, so `"a" .. name()` still counts.
 */
function isReachedThroughValue(source, index) {
  let i = index - 1
  while (i >= 0 && (source[i] === ' ' || source[i] === '\t')) i -= 1

  if (source[i] === ':') return true
  return source[i] === '.' && source[i - 1] !== '.'
}

/**
 * Whether what follows the identifier makes this a call: `(`, a string literal
 * argument, or a table constructor.
 */
function isCall(source, index) {
  let i = index
  while (i < source.length && (source[i] === ' ' || source[i] === '\t')) i += 1

  const char = source[i]
  if (char === '(' || char === '"' || char === "'" || char === '{') return true
  // A long-string argument: cecho[[...]].
  return char === '[' && (source[i + 1] === '[' || source[i + 1] === '=')
}

/** The `(params)` of a function header, given the source just past `function`. */
const FUNCTION_HEADER = /^\s*(?:[A-Za-z_][\w.:]*)?\s*\(([^)]*)\)/

/**
 * Count the calls one chunk makes, split into Mudlet's own API and everything
 * else that looks like a call to something the chunk did not define.
 *
 * Locals and parameters are tracked on a stack of block scopes, so they shadow
 * a Mudlet function only where Lua says they do. It is a scanner rather than a
 * parser, so the scopes are approximate in both directions - an `if` branch
 * that fails to close leaves its scope open until the chunk ends - but the
 * error is bounded by the block rather than running to the whole package.
 *
 * `globals` are the package's own global definitions, which shadow everywhere.
 * `classify` decides which side a name falls on - see mudletApi() in the
 * driver, which builds it from the function list and the manual.
 */
function countCalls(source, globals, classify) {
  const api = new Map()
  const beyond = new Map()

  // Innermost scope last. `self` is implicit in every method, so it is never
  // the package reaching for a library namespace of that name.
  const scopes = [new Set(['self'])]
  const declare = (name) => scopes[scopes.length - 1].add(name)
  const isLocal = (name) => scopes.some((scope) => scope.has(name))
  const open = (names) => scopes.push(new Set(names))
  const close = () => {
    if (scopes.length > 1) scopes.pop()
  }

  // Names between `for` and the `do` that opens the loop body they belong to.
  let loopVariables = []
  // A function header consumed whole, so its name is not read as a call to
  // itself and its parameters are not read as calls to their arguments.
  let skipTo = 0

  const bump = (map, name) => map.set(name, (map.get(name) ?? 0) + 1)

  for (const match of source.matchAll(TOKEN)) {
    const token = match[0]
    const at = match.index
    if (at < skipTo) continue

    const root = token.split(/[.:]/)[0]

    if (LUA_KEYWORDS.has(root)) {
      const rest = source.slice(at + token.length)

      switch (root) {
        case 'function': {
          const header = FUNCTION_HEADER.exec(rest)
          const parameters = (header?.[1] ?? '')
            .split(',')
            .map((parameter) => parameter.trim())
            .filter((parameter) => /^[A-Za-z_]\w*$/.test(parameter))
          open(['self', ...parameters])
          if (header) skipTo = at + token.length + header[0].length
          break
        }
        // `do` closes a `for`/`while` header and opens the body those loop
        // variables live in; a bare `do ... end` block just opens a scope.
        case 'do':
          open(loopVariables)
          loopVariables = []
          break
        case 'then':
        case 'repeat':
          open([])
          break
        // Each branch of an `if` is its own scope; `elseif` opens the next one
        // through the `then` that follows it.
        case 'else':
          close()
          open([])
          break
        case 'elseif':
          close()
          break
        case 'end':
        case 'until':
          close()
          break
        case 'for': {
          const header = /^([^=]*?)\bin\b|^([^\n]*?)=/.exec(rest)
          loopVariables = (header?.[1] ?? header?.[2] ?? '')
            .split(',')
            .map((name) => name.trim())
            .filter((name) => /^[A-Za-z_]\w*$/.test(name))
          break
        }
        case 'local': {
          const named = /^\s*function\s+([A-Za-z_]\w*)/.exec(rest)
          if (named) {
            declare(named[1])
            break
          }
          // `local a, b = ...` and `local a` both, hence the optional assignment.
          const names = /^\s*([A-Za-z_][\w\s,]*?)\s*(?:=|$|\r|\n)/.exec(rest)
          for (const name of names?.[1].split(',') ?? []) {
            const trimmed = name.trim()
            if (/^[A-Za-z_]\w*$/.test(trimmed)) declare(trimmed)
          }
          break
        }
        default:
          break
      }
      continue
    }

    if (!isCall(source, at + token.length)) continue
    if (isReachedThroughValue(source, at)) continue
    if (globals.has(root) || isLocal(root)) continue

    // Namespaced calls are recorded at two segments: Geyser.Label, table.save.
    // Anything deeper (Geyser.Label.someField) folds into those. A chain
    // reached through `:` is a method call on a value - self:foo(),
    // someWindow:show() - rather than a namespaced library function.
    let name = token
    if (token !== root) {
      if (!token.startsWith(`${root}.`)) continue
      name = token.split(/[.:]/).slice(0, 2).join('.')
    }

    const kind = classify(name)
    if (kind === 'lua') continue
    bump(kind === 'mudlet' ? api : beyond, name)
  }

  return { api, beyond }
}

/**
 * The calls a whole package makes. Each script body and each .lua file is
 * scanned as its own chunk, which is what Mudlet runs them as - a top-level
 * `local` in one does not reach into the next.
 */
function countPackageCalls(chunks, classify) {
  const globals = globalDefinitions(chunks.join('\n'))
  const api = new Map()
  const beyond = new Map()

  for (const chunk of chunks) {
    const counts = countCalls(chunk, globals, classify)
    for (const [name, count] of counts.api) api.set(name, (api.get(name) ?? 0) + count)
    for (const [name, count] of counts.beyond) beyond.set(name, (beyond.get(name) ?? 0) + count)
  }

  return { api, beyond }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/** The documented API: function name -> signature, as Mudlet publishes it. */
async function fetchApiList() {
  const response = await fetch(FUNCTION_LIST_URL)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${FUNCTION_LIST_URL}`)
  }

  const list = await response.json()
  const signatures = new Map(
    Object.entries(list ?? {}).filter(
      ([name, signature]) => /^[A-Za-z_]\w*$/.test(name) && typeof signature === 'string'
    )
  )
  // A list this short means the file has changed shape rather than that Mudlet
  // has lost 500 functions, and stats built on it would be quietly wrong.
  if (signatures.size < 100) {
    throw new Error(`${FUNCTION_LIST_URL} yielded only ${signatures.size} function names`)
  }
  return signatures
}

/** Anchor ids on a wiki manual page, which are the function names it documents. */
async function fetchWikiAnchors({ page }) {
  const response = await fetch(`${WIKI_BASE}${page}`, {
    // The wiki turns away requests that do not name themselves.
    headers: { 'User-Agent': 'mudlet-package-repository build (api usage stats)' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${page}`)

  const html = await response.text()
  const names = new Set()
  for (const match of html.matchAll(/id="([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)"/g)) {
    names.add(match[1])
  }
  return names
}

/**
 * What counts as Mudlet's API, and where each name is documented.
 *
 * The function list is the spine, but it holds global functions only, so the
 * manual's anchors supply the rest: Geyser.Label, table.save, io.exists and the
 * other namespaced ones that are just as much Mudlet's as send() is. A page's
 * declared namespaces cover what it owns but has no anchor for, and they are
 * what keeps Geyser counted as Mudlet even if the wiki cannot be reached.
 */
async function mudletApi(signatures) {
  /** name -> the manual page documenting it. */
  const documentedOn = new Map()
  /** namespace root -> the manual page that owns it. */
  const namespacePages = new Map()

  for (const entry of WIKI_PAGES) {
    for (const namespace of entry.namespaces) namespacePages.set(namespace, entry.page)

    try {
      for (const name of await fetchWikiAnchors(entry)) {
        if (!documentedOn.has(name)) documentedOn.set(name, entry.page)
      }
    } catch (error) {
      // Losing the wiki costs precision in the split and some deep links, but
      // the function list already carries the bulk of both.
      console.warn(`Could not read ${entry.page}: ${error.message}`)
    }
  }

  /** 'mudlet' | 'lua' | 'other'. */
  const classify = (name) => {
    // The function list first: Mudlet replaces a couple of Lua's own functions
    // - print() echoes to the main window - and those are its API, not Lua's.
    if (signatures.has(name)) return 'mudlet'
    // Then Lua's library, because Mudlet's manual documents table.insert and
    // string.format alongside its own additions to those tables, and the
    // manual alone would hand Mudlet the whole standard library.
    if (STANDARD_LUA.has(name)) return 'lua'

    const root = name.split('.')[0]
    if (root === name) return 'other'
    // Only namespaced names are taken from the manual: a bare anchor could be
    // any section heading on the page, and the function list already settles
    // the global ones.
    return namespacePages.has(root) || documentedOn.has(name) ? 'mudlet' : 'other'
  }

  const documentationUrl = (name) => {
    const page = documentedOn.get(name)
    if (page) return `${WIKI_BASE}${page}#${encodeURIComponent(name)}`

    const owner = namespacePages.get(name.split('.')[0])
    if (owner && !signatures.has(name)) return `${WIKI_BASE}${owner}`

    // Anything in the function list is documented on the manual page even if
    // its anchors could not be read just now.
    if (signatures.has(name)) {
      return `${WIKI_BASE}Manual:Lua_Functions#${encodeURIComponent(name)}`
    }
    return null
  }

  return { classify, documentationUrl }
}

/**
 * The slug a package page is served under. Kept in step with packageSlug in
 * app/lib/urls.ts - this file cannot import it, being plain ESM run before the
 * TypeScript build, and a drifting copy would link the stats page at 404s.
 */
function slugOf(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Filename -> package name, from the generated index. Slugs derive from the
 * package name rather than the file it lives in (Ansalon_Mudlet_Mapper_1.0.4
 * .mpackage is "Ansalon Mudlet Mapper"), so the index is what says where a
 * package page lives. A checkout without one still gets stats, just with the
 * filenames standing in for names.
 */
async function readIndex() {
  try {
    const raw = await readFile(path.join(packagesDir, 'mpkg.packages.json'), 'utf8')
    const { packages } = JSON.parse(raw)
    if (!Array.isArray(packages)) return null

    const names = new Map()
    for (const pkg of packages) {
      if (pkg?.filename && pkg?.mpackage) names.set(pkg.filename, pkg.mpackage)
    }
    return names.size ? names : null
  } catch {
    return null
  }
}

async function main() {
  const signatures = await fetchApiList()
  const { classify, documentationUrl } = await mudletApi(signatures)
  const index = await readIndex()

  let entries
  try {
    entries = (await readdir(packagesDir)).filter((name) => name.endsWith('.mpackage'))
  } catch {
    throw new Error(`No packages directory at ${packagesDir}`)
  }
  entries.sort((a, b) => a.localeCompare(b))

  const apiPackages = new Map()
  const apiCalls = new Map()
  const beyondPackages = new Map()
  const beyondCalls = new Map()
  const packages = []
  const skipped = []
  const truncated = []

  let luaBytes = 0
  let luaFileBytes = 0

  for (const filename of entries) {
    const archive = path.join(packagesDir, filename)
    let buffer
    try {
      buffer = await readFile(archive)
    } catch {
      skipped.push({ filename, reason: 'unreadable' })
      continue
    }

    if (buffer.length > MAX_ARCHIVE_BYTES) {
      skipped.push({ filename, reason: 'archive too large' })
      continue
    }

    let sources
    try {
      sources = readLuaSources(new AdmZip(buffer))
    } catch {
      skipped.push({ filename, reason: 'not a readable archive' })
      continue
    }

    // Partial counts, so say so rather than presenting them as the whole story.
    if (sources.truncated) truncated.push(filename)

    const chunks = [...sources.xmlScripts, ...sources.luaFiles].map(stripLuaNoise)
    luaBytes += chunks.reduce((total, chunk) => total + chunk.length, 0)
    luaFileBytes += sources.luaFiles.reduce((total, file) => total + file.length, 0)

    const { api, beyond } = countPackageCalls(chunks, classify)

    for (const [name, count] of api) {
      apiPackages.set(name, (apiPackages.get(name) ?? 0) + 1)
      apiCalls.set(name, (apiCalls.get(name) ?? 0) + count)
    }
    for (const [name, count] of beyond) {
      beyondPackages.set(name, (beyondPackages.get(name) ?? 0) + 1)
      beyondCalls.set(name, (beyondCalls.get(name) ?? 0) + count)
    }

    const total = [...api.values()].reduce((sum, count) => sum + count, 0)
    const name = index?.get(filename) ?? filename.replace(/\.mpackage$/i, '')
    packages.push({
      name,
      slug: slugOf(name),
      functions: api.size,
      calls: total,
      top: [...api.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([name]) => name),
      shipsLuaFiles: sources.luaFiles.length > 0,
    })
  }

  const byUsage = (map, callMap, describe = () => undefined) =>
    [...map.entries()]
      .map(([name, count]) => ({
        name,
        signature: describe(name),
        url: documentationUrl(name),
        packages: count,
        calls: callMap.get(name) ?? 0,
      }))
      .sort((a, b) => b.packages - a.packages || b.calls - a.calls || a.name.localeCompare(b.name))

  const report = {
    generatedAt: new Date().toISOString(),
    source: FUNCTION_LIST_URL,
    packagesScanned: packages.length,
    apiFunctionCount: signatures.size,
    luaBytes,
    luaFileBytes,
    // How many of the listed functions are used, which is what the count is
    // measured against - the used list also holds namespaced names the function
    // list does not carry.
    listedFunctionsUsed: [...apiPackages.keys()].filter((name) => signatures.has(name)).length,
    functions: byUsage(apiPackages, apiCalls, (name) => signatures.get(name)),
    unused: [...signatures.entries()]
      .filter(([name]) => !apiPackages.has(name))
      .map(([name, signature]) => ({ name, signature, url: documentationUrl(name) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    beyond: byUsage(beyondPackages, beyondCalls)
      .filter((entry) => entry.packages >= MIN_BEYOND_PACKAGES)
      .slice(0, MAX_BEYOND_NAMES),
    packages: packages.sort((a, b) => b.functions - a.functions || a.name.localeCompare(b.name)),
    skipped,
    /** Packages read only as far as the per-package budget; counts are partial. */
    truncated,
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)

  console.log(
    `API usage: ${report.listedFunctionsUsed} of ${report.apiFunctionCount} listed functions used, `+
      `${report.functions.length - report.listedFunctionsUsed} namespaced, ` +
      `across ${report.packagesScanned} packages` +
      (skipped.length ? `, ${skipped.length} skipped` : '') +
      (truncated.length ? `, ${truncated.length} read only in part` : '')
  )
}

// A build that cannot say which functions are Mudlet's would publish a stats
// page built on nothing, so this fails the build rather than shipping one.
// predev runs it with `|| true` instead: a developer offline still gets a site,
// with the stats page saying its numbers have not been generated.
main().catch((error) => {
  console.error(`Could not generate API usage stats: ${error.message}`)
  process.exit(1)
})
