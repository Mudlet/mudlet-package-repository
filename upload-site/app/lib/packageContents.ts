import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import {
  PackageContents,
  PackageEntity,
  PackageEntityKind,
  PackageEntityFact,
  PackageFileEntry,
} from './types'
import { describeKeyCombination } from './qtKeys'

/** Archives bigger than this are listed but not parsed - see fetchPackageArchive. */
const MAX_PARSE_BYTES = 50 * 1024 * 1024
/**
 * Cap on the *uncompressed* package XML. The archive being small says nothing
 * about the cost of expanding one entry - deflate reaches ratios in the
 * thousands - so this is what stops a small upload from turning into gigabytes
 * of string and parse tree. The largest real package unpacks to about 10 MB.
 */
const MAX_XML_BYTES = 16 * 1024 * 1024
/** Per-item Lua source cap, so one giant script cannot bloat a page. */
const MAX_SCRIPT_CHARS = 20_000
/** Overall Lua budget across the whole package. */
const MAX_TOTAL_SCRIPT_CHARS = 500_000
/** Cap for a single script fetched on demand. */
const MAX_ONDEMAND_SCRIPT_CHARS = 200_000
/** Upper bound on listed files (ROTD_GUI alone holds 993). */
const MAX_FILES = 2_000

/**
 * A Mudlet package XML holds one container per item type; each container mixes
 * leaf items with `<...Group>` folders that nest arbitrarily deep.
 */
const CONTAINERS = [
  { container: 'TriggerPackage', item: 'Trigger', group: 'TriggerGroup', kind: PackageEntityKind.trigger },
  { container: 'AliasPackage', item: 'Alias', group: 'AliasGroup', kind: PackageEntityKind.alias },
  { container: 'ScriptPackage', item: 'Script', group: 'ScriptGroup', kind: PackageEntityKind.script },
  { container: 'TimerPackage', item: 'Timer', group: 'TimerGroup', kind: PackageEntityKind.timer },
  { container: 'KeyPackage', item: 'Key', group: 'KeyGroup', kind: PackageEntityKind.key },
  { container: 'ActionPackage', item: 'Action', group: 'ActionGroup', kind: PackageEntityKind.button },
] as const

const ARRAY_TAGS = new Set<string>([
  ...CONTAINERS.map((c) => c.item),
  ...CONTAINERS.map((c) => c.group),
  'string',
  'integer',
])

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Scripts are whitespace-significant Lua, so values are kept verbatim and
  // left unparsed (a version like "1.001" must not become a number).
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name) => ARRAY_TAGS.has(name),
})

/** The package XML sits at the archive root and is the only .xml there. */
const findXmlEntry = (zip: AdmZip) =>
  zip.getEntries().find((entry) => !entry.isDirectory && /^[^/]+\.xml$/i.test(entry.entryName)) ??
  null

/**
 * The XML source, or null if unpacking it would blow the budget. The zip header
 * carries the uncompressed size, so this decides before getData() expands
 * anything - see MAX_XML_BYTES.
 */
const readXmlSource = (entry: AdmZip.IZipEntry): string | null =>
  entry.header.size > MAX_XML_BYTES ? null : entry.getData().toString('utf8')

const emptyCounts = (): Record<PackageEntityKind, number> => ({
  [PackageEntityKind.trigger]: 0,
  [PackageEntityKind.alias]: 0,
  [PackageEntityKind.script]: 0,
  [PackageEntityKind.timer]: 0,
  [PackageEntityKind.key]: 0,
  [PackageEntityKind.button]: 0,
})

const text = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return null
  const str = String(value).trim()
  return str.length ? str : null
}

const isYes = (value: unknown) => String(value ?? '').toLowerCase() === 'yes'

/** Mudlet's triggerType integers, in <regexCodePropertyList>. */
const PATTERN_TYPES = [
  'substring',
  'regex',
  'begins with',
  'exact match',
  'Lua function',
  'line spacer',
  'colour trigger',
  'prompt',
]

const stringList = (value: unknown): string[] =>
  ((value as { string?: unknown[] } | undefined)?.string ?? [])
    .map((entry) => text(entry))
    .filter((entry): entry is string => Boolean(entry))

/** Trigger patterns, each with the match type Mudlet stored alongside it. */
function triggerPatterns(node: Record<string, unknown>): PackageEntityFact[] {
  const patterns = stringList(node.regexCodeList)
  const types = ((node.regexCodePropertyList as { integer?: unknown[] } | undefined)?.integer ??
    []) as unknown[]

  return patterns.map((pattern, index) => ({
    label: PATTERN_TYPES[Number(text(types[index]) ?? 0)] ?? 'substring',
    value: pattern,
    mono: true,
  }))
}

/** "00:00:01.500" -> "1.5s"; Mudlet writes timers as HH:MM:SS.mmm. */
function describeInterval(value: string | null): string | null {
  if (!value) return null
  const parts = value.split(':').map((part) => Number(part))
  if (parts.some((part) => Number.isNaN(part))) return value

  const seconds =
    parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts.length === 2
        ? parts[0] * 60 + parts[1]
        : parts[0]
  if (!seconds) return null

  if (seconds < 60) return `${Number(seconds.toFixed(3))}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Number((seconds % 60).toFixed(3))
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

const BUTTON_LOCATIONS = ['top', 'bottom', 'left', 'right', 'floating']
const BUTTON_ORIENTATIONS = ['horizontal', 'vertical']

/** The fields worth showing for an item, by kind. */
function factsOf(kind: PackageEntityKind, node: Record<string, unknown>): PackageEntityFact[] {
  switch (kind) {
    case PackageEntityKind.trigger: {
      const facts = triggerPatterns(node)
      if (isYes(node['@_isMultiline'])) facts.push({ label: 'Matching', value: 'multiline' })
      if (isYes(node['@_isFilterTrigger'])) facts.push({ label: 'Matching', value: 'filter' })
      return facts
    }
    case PackageEntityKind.alias: {
      const pattern = text(node.regex)
      return pattern ? [{ label: 'Pattern', value: pattern, mono: true }] : []
    }
    case PackageEntityKind.script:
      return stringList(node.eventHandlerList).map((event) => ({
        label: 'Handles event',
        value: event,
        mono: true,
      }))
    case PackageEntityKind.timer: {
      const interval = describeInterval(text(node.time))
      return interval ? [{ label: 'Every', value: interval }] : []
    }
    case PackageEntityKind.key: {
      const combination = describeKeyCombination(text(node.keyCode), text(node.keyModifier))
      return combination ? [{ label: 'Shortcut', value: combination, mono: true }] : []
    }
    case PackageEntityKind.button: {
      const location = BUTTON_LOCATIONS[Number(text(node.location) ?? -1)]
      const orientation = BUTTON_ORIENTATIONS[Number(text(node.orientation) ?? -1)]
      const facts: PackageEntityFact[] = []
      if (location) facts.push({ label: 'Position', value: location })
      if (orientation) facts.push({ label: 'Layout', value: orientation })
      return facts
    }
  }
}

/** The one-line summary shown next to an item's name in the tree. */
function detailOf(kind: PackageEntityKind, facts: PackageEntityFact[]): string | null {
  if (!facts.length) return null

  if (kind === PackageEntityKind.script) {
    return `on ${facts.map((fact) => fact.value).join(', ')}`
  }
  if (kind === PackageEntityKind.timer) {
    return `every ${facts[0].value}`
  }

  const shown = facts.slice(0, 2).map((fact) => fact.value)
  return facts.length > 2 ? `${shown.join(' · ')} · +${facts.length - 2} more` : shown.join(' · ')
}

/**
 * Direct children of a node, folders first so ids stay stable between the
 * listing pass and a later script lookup. Two Mudlet quirks are handled here:
 * some exports wrap children in a <children> element, and triggers and scripts
 * can nest under a *non-folder* parent (chain triggers, scripts that both carry
 * a body and hold children) - so children are collected for every node, not
 * only for groups.
 */
function childNodes(
  node: Record<string, unknown>,
  config: (typeof CONTAINERS)[number]
): { node: Record<string, unknown>; isFolder: boolean }[] {
  const container = ((node.children as Record<string, unknown> | undefined) ?? node)
  const groups = (container[config.group] as Record<string, unknown>[] | undefined) ?? []
  const items = (container[config.item] as Record<string, unknown>[] | undefined) ?? []

  return [
    ...groups.map((group) => ({ node: group, isFolder: true })),
    // An item can still be marked as a folder by attribute.
    ...items.map((item) => ({ node: item, isFolder: isYes(item['@_isFolder']) })),
  ].filter(({ node: child }) => !isYes(child['@_isTempTrigger']) && !isYes(child['@_isTempTimer']))
}

/** The game command an item sends, for the items that send one. */
function commandOf(kind: PackageEntityKind, node: Record<string, unknown>): string | null {
  switch (kind) {
    case PackageEntityKind.trigger:
      return text(node.mCommand)
    case PackageEntityKind.button:
      return text(node.mCommandButtonUp) ?? text(node.mCommandButtonDown)
    default:
      return text(node.command)
  }
}

export function parsePackageContents(
  buffer: Buffer,
  { inlineScripts = false }: { inlineScripts?: boolean } = {}
): PackageContents {
  const contents: PackageContents = {
    files: [],
    entities: [],
    counts: emptyCounts(),
    xmlPath: null,
    totalUncompressedSize: 0,
    note: null,
  }

  if (buffer.length > MAX_PARSE_BYTES) {
    contents.note = 'This package is too large to preview here - download it to see what is inside.'
    return contents
  }

  let zip: AdmZip
  try {
    zip = new AdmZip(buffer)
  } catch {
    contents.note = 'This file could not be opened as a Mudlet package archive.'
    return contents
  }

  const entries = zip.getEntries()
  const files: PackageFileEntry[] = []

  for (const entry of entries) {
    contents.totalUncompressedSize += entry.header.size
    if (files.length < MAX_FILES) {
      files.push({
        path: entry.entryName,
        size: entry.header.size,
        isDirectory: entry.isDirectory,
      })
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path))
  contents.files = files
  if (entries.length > MAX_FILES) {
    contents.note = `Only the first ${MAX_FILES} of ${entries.length} files are listed.`
  }

  const xmlEntry = findXmlEntry(zip)
  if (!xmlEntry) return contents
  contents.xmlPath = xmlEntry.entryName

  const xmlSource = readXmlSource(xmlEntry)
  if (xmlSource === null) {
    contents.note = 'The package XML is too large to read here, so only its files are listed.'
    return contents
  }

  let root: Record<string, unknown>
  try {
    const parsed = parser.parse(xmlSource)
    root = (parsed?.MudletPackage ?? {}) as Record<string, unknown>
  } catch {
    contents.note = 'The package XML could not be parsed, so only its files are listed.'
    return contents
  }

  let scriptBudget = MAX_TOTAL_SCRIPT_CHARS

  const build = (
    node: Record<string, unknown>,
    config: (typeof CONTAINERS)[number],
    isFolder: boolean,
    id: string
  ): PackageEntity => {
    const attrs = node as Record<string, unknown>
    let script: string | null = null
    let scriptTruncated = false

    // Groups carry a script of their own too, so this is not limited to leaves.
    const source = text(node.script)
    if (source && inlineScripts) {
      if (scriptBudget <= 0) {
        scriptTruncated = true
      } else {
        const capped = source.slice(0, Math.min(MAX_SCRIPT_CHARS, scriptBudget))
        scriptTruncated = capped.length < source.length
        script = capped
        scriptBudget -= capped.length
      }
    }

    // Counts describe the items a package installs, so folders are not counted.
    if (!isFolder) contents.counts[config.kind] += 1

    const facts = isFolder ? [] : factsOf(config.kind, node)

    return {
      id,
      kind: config.kind,
      name: text(node.name) ?? '(unnamed)',
      isActive: isYes(attrs['@_isActive']),
      isFolder,
      detail: detailOf(config.kind, facts),
      facts,
      command: commandOf(config.kind, node),
      hasScript: Boolean(source),
      script,
      scriptTruncated,
      // Triggers and scripts nest under non-folder parents too, so children are
      // collected for every node - leaves simply come back with none.
      children: collect(node, config, id),
    }
  }

  const collect = (
    node: Record<string, unknown>,
    config: (typeof CONTAINERS)[number],
    parentId: string
  ): PackageEntity[] =>
    childNodes(node, config).map(({ node: child, isFolder }, index) =>
      build(child, config, isFolder, `${parentId}/${index}`)
    )

  for (const config of CONTAINERS) {
    const container = root[config.container]
    // Empty containers parse to '' or {}; both simply yield nothing.
    if (!container || typeof container !== 'object') continue
    contents.entities.push(
      ...collect(container as Record<string, unknown>, config, config.kind)
    )
  }

  return contents
}

/**
 * Pulls one item's Lua out of a package on demand, addressed by the id
 * parsePackageContents handed out. Package pages use this instead of shipping
 * every script to the browser - the largest packages hold megabytes of Lua.
 */
export function extractEntityScript(
  buffer: Buffer,
  id: string
): { script: string; truncated: boolean } | null {
  const [kindSegment, ...indexes] = id.split('/')
  const config = CONTAINERS.find((entry) => entry.kind === kindSegment)
  if (!config || indexes.length === 0) return null

  let zip: AdmZip
  try {
    zip = new AdmZip(buffer)
  } catch {
    return null
  }

  const xmlEntry = findXmlEntry(zip)
  if (!xmlEntry) return null

  const xmlSource = readXmlSource(xmlEntry)
  if (xmlSource === null) return null

  let node: Record<string, unknown>
  try {
    const parsed = parser.parse(xmlSource)
    const container = parsed?.MudletPackage?.[config.container]
    if (!container || typeof container !== 'object') return null
    node = container as Record<string, unknown>
  } catch {
    return null
  }

  for (const segment of indexes) {
    const index = Number(segment)
    const child = childNodes(node, config)[index]
    if (!child) return null
    node = child.node
  }

  const source = text(node.script)
  if (!source) return null

  const capped = source.slice(0, MAX_ONDEMAND_SCRIPT_CHARS)
  return { script: capped, truncated: capped.length < source.length }
}
