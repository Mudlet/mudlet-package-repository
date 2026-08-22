import Link from 'next/link'
import { authorHref, authorSlug, parseAuthorCredits } from '@/app/lib/authors'

/**
 * A package's author line, with every name in it linked to that author's page
 * and the rest of the credit left exactly as written - so "Akaya, mods by
 * Zooka" keeps saying that, while both names lead somewhere.
 *
 * The parser reports where it read each name, and the line is cut at those
 * points; the text between them is passed through untouched. Nothing is
 * searched for, so a field that credits someone before naming its own author -
 * "(mods by Zooka), Akaya" - links both, and a name that appears twice links
 * the mention it was read from.
 */
export const AuthorCredit = ({ author }: { author: string | null }) => {
  if (!author) return null

  const nodes: React.ReactNode[] = []
  let cursor = 0

  parseAuthorCredits(author).forEach((credit, index) => {
    const slug = authorSlug(credit.name)
    if (!slug || credit.at < cursor) return

    if (credit.at > cursor) nodes.push(author.slice(cursor, credit.at))
    nodes.push(
      <Link
        key={`${slug}-${index}`}
        href={authorHref(slug)}
        className="text-accent hover:text-accent-hover"
      >
        {author.slice(credit.at, credit.at + credit.length)}
      </Link>
    )
    cursor = credit.at + credit.length
  })

  if (cursor < author.length) nodes.push(author.slice(cursor))

  return <>{nodes}</>
}
