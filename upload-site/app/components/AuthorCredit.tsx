import Link from 'next/link'
import { authorHref, authorSlug, parseAuthorNames } from '@/app/lib/authors'

/**
 * A package's author line, with every name in it linked to that author's page
 * and the rest of the credit left exactly as written - so "Akaya, mods by
 * Zooka" keeps saying that, while both names lead somewhere.
 *
 * The names come out of this very string, so each is found in it by scanning
 * forwards; a name that cannot be located (a parenthetical dropped as contact
 * details, say) is simply left unlinked rather than moved or invented.
 */
export const AuthorCredit = ({ author }: { author: string | null }) => {
  if (!author) return null

  const nodes: React.ReactNode[] = []
  let cursor = 0

  parseAuthorNames(author).forEach((name, index) => {
    const at = author.indexOf(name, cursor)
    const slug = authorSlug(name)
    if (at < 0 || !slug) return

    if (at > cursor) nodes.push(author.slice(cursor, at))
    nodes.push(
      <Link
        key={`${slug}-${index}`}
        href={authorHref(slug)}
        className="text-accent hover:text-accent-hover"
      >
        {name}
      </Link>
    )
    cursor = at + name.length
  })

  if (cursor < author.length) nodes.push(author.slice(cursor))

  return <>{nodes}</>
}
