import { UploadedPackageMetadata } from './types'

/**
 * The `author` field of an .mpackage is free text, and authors have used it as
 * such: some name one person, some name several separated by commas, and some
 * credit a second contributor in prose - "Akaya, mods by Zooka",
 * "demonnic (mods by Zooka)", "Multiple DSL Contributors, Packaged by Zooka".
 * Author pages are only useful if all of those land on the same person, so the
 * field is split into individual credits here rather than treated as a name.
 *
 * The parsing is deliberately cautious: it splits on punctuation that can only
 * be a separator, and leaves anything it cannot read confidently as a single
 * name. "Adventurer1111 and Telepati's Mapping" stays whole, because " and "
 * joins a credit to a component there rather than one person to another.
 */

/**
 * A credit phrase in front of a name: "mods by Zooka", "Packaged by Zooka",
 * "updated by Elene", or a bare "by Zooka". Up to three words may precede the
 * "by" so unforeseen phrasings ("with additional work by ...") still resolve
 * to the name; the "by" itself is required, so an ordinary name is never
 * mistaken for a credit.
 */
const CREDIT_PREFIX = /^(?:[\p{L}][\p{L}\p{N}'’-]*\s+){0,3}by\s+/iu

/** A parenthetical carrying contact details rather than a name. */
const CONTACT = /@|https?:\/\/|www\.|\.(?:com|net|org|io|dev|eu)\b/i

/** Punctuation that separates one credit from the next, kept when splitting. */
const SEPARATORS = /([,;&]+)/

/** Punctuation left on the front or the back of a credit once it is split out. */
const LEADING_EDGE = /^[\s\-–—:.·|]+/
const TRAILING_EDGE = /[\s\-–—:.·|]+$/

/** One person credited by an author field, and where it credits them. */
export interface AuthorCreditRef {
  /** The name, with runs of whitespace collapsed - what identifies the author. */
  name: string
  /** Where the credit begins in the author field it was read from. */
  at: number
  /** Its length there, so the field's own wording can be quoted back exactly. */
  length: number
}

/**
 * The people credited by one `author` field, in the order the field names
 * them, without repeats (case-insensitively - "Demonnic, demonnic" is one
 * person twice; the first mention is the one kept).
 *
 * Each credit carries where it was found, so a caller rendering the field can
 * mark up the names in place instead of searching for them afterwards - a
 * search would have to guess which mention of a name it had reached.
 */
export function parseAuthorCredits(author: string | null | undefined): AuthorCreditRef[] {
  if (!author) return []

  // A parenthetical is either a credit of its own ("(mods by Zooka)"), contact
  // details that are not part of the name ("(caevorasmailbox@gmail.com)"), or
  // something this cannot read - which stays in the name, so that two authors
  // distinguished only by their parenthetical are not merged into one.
  //
  // The two it does read are blanked out of the field rather than removed from
  // it: same length, so every index taken below still points into the original
  // string, whichever end of the field the parenthetical sits at.
  const segments: { text: string; at: number }[] = []
  let outer = author

  for (const match of author.matchAll(/\(([^)]*)\)/g)) {
    const at = match.index
    const inner = match[1]
    const trimmed = inner.trim()
    const isCredit = CREDIT_PREFIX.test(trimmed)
    if (!isCredit && !CONTACT.test(trimmed)) continue

    outer =
      outer.slice(0, at) + ' '.repeat(match[0].length) + outer.slice(at + match[0].length)
    if (isCredit) segments.push({ text: inner, at: at + 1 })
  }

  segments.unshift({ text: outer, at: 0 })

  const credits: AuthorCreditRef[] = []
  for (const segment of segments) {
    let offset = segment.at
    for (const [index, piece] of segment.text.split(SEPARATORS).entries()) {
      // split() with a capturing group hands back the separators too, so that
      // what is skipped here still advances the offset past them.
      if (index % 2 === 0) {
        const credit = readCredit(piece, offset)
        if (credit) credits.push(credit)
      }
      offset += piece.length
    }
  }

  credits.sort((a, b) => a.at - b.at)

  const seen = new Set<string>()
  return credits.filter((credit) => {
    const key = credit.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * One split-off piece of an author field, narrowed to the name inside it -
 * measured rather than rewritten, so the caller keeps the offsets.
 */
function readCredit(piece: string, at: number): AuthorCreditRef | null {
  let start = 0
  let end = piece.length

  // The credit phrase is anchored to the start of the piece, so the space that
  // followed the comma comes off first.
  start += piece.match(LEADING_EDGE)?.[0].length ?? 0
  start += piece.slice(start, end).match(CREDIT_PREFIX)?.[0].length ?? 0
  start += piece.slice(start, end).match(LEADING_EDGE)?.[0].length ?? 0
  end -= piece.slice(start, end).match(TRAILING_EDGE)?.[0].length ?? 0

  const name = piece.slice(start, end).replace(/\s+/g, ' ')
  return name ? { name, at: at + start, length: end - start } : null
}

/**
 * The names of the people credited by one `author` field, in the order it
 * names them. Callers that need to know where each was written use
 * parseAuthorCredits instead.
 */
export function parseAuthorNames(author: string | null | undefined): string[] {
  return parseAuthorCredits(author).map((credit) => credit.name)
}

/**
 * URL-safe identifier for an author, used as the /authors/[slug] segment, and
 * as the identity two spellings of one name are merged under - which is what
 * puts "Demonnic" and "demonnic" on the same page. Letters outside ASCII are
 * kept rather than dropped, so a name written in a non-Latin script still has
 * a slug of its own instead of an empty one.
 */
export function authorSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function authorHref(slug: string): string {
  return `/authors/${encodeURIComponent(slug)}`
}

/** One author, and everything of theirs in the repository. */
export interface AuthorSummary {
  slug: string
  /** The spelling most of their packages use. */
  name: string
  /** Every spelling seen, most used first - "Demonnic" as well as "demonnic". */
  aliases: string[]
  /** Their packages, most recently updated first. */
  packages: UploadedPackageMetadata[]
  /** Upload timestamp of the most recently updated one. */
  latestUpload: number
}

/** Every author in the index, alphabetically. */
export function collectAuthors(packages: UploadedPackageMetadata[]): AuthorSummary[] {
  const bySlug = new Map<
    string,
    { slug: string; spellings: Map<string, number>; packages: UploadedPackageMetadata[] }
  >()

  for (const pkg of packages) {
    for (const name of parseAuthorNames(pkg.author)) {
      const slug = authorSlug(name)
      // A "name" of nothing but punctuation has no page to link to.
      if (!slug) continue

      let entry = bySlug.get(slug)
      if (!entry) {
        entry = { slug, spellings: new Map(), packages: [] }
        bySlug.set(slug, entry)
      }
      entry.spellings.set(name, (entry.spellings.get(name) ?? 0) + 1)
      entry.packages.push(pkg)
    }
  }

  return [...bySlug.values()]
    .map((entry) => {
      // Whichever spelling the author used most often wins; ties break
      // alphabetically rather than on map order, so the name a page is built
      // with does not depend on the order packages happened to be indexed in.
      const aliases = [...entry.spellings.entries()]
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .map(([spelling]) => spelling)
      const sorted = entry.packages.slice().sort((a, b) => b.uploaded - a.uploaded)

      return {
        slug: entry.slug,
        name: aliases[0],
        aliases,
        packages: sorted,
        latestUpload: sorted.length ? sorted[0].uploaded : 0,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
}

export function findAuthor(
  packages: UploadedPackageMetadata[],
  slug: string
): AuthorSummary | null {
  return collectAuthors(packages).find((author) => author.slug === slug) ?? null
}

/**
 * How many packages each author has, keyed by slug - what tells a card that
 * the author it names is a prolific one.
 */
export function authorPackageCounts(packages: UploadedPackageMetadata[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const pkg of packages) {
    for (const name of parseAuthorNames(pkg.author)) {
      const slug = authorSlug(name)
      if (!slug) continue
      counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
  }
  return counts
}
