import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PackageCard } from '@/app/components/PackageCard'
import {
  AuthorSummary,
  authorHref,
  authorSlug,
  collectAuthors,
  parseAuthorNames,
} from '@/app/lib/authors'
import { fetchRepositoryPackages } from '@/app/lib/packages'
import { formatDate } from '@/app/lib/urls'

type PageProps = { params: Promise<{ slug: string }> }

/** Author pages change exactly when the index does, so they share its window. */
export const revalidate = 600

/**
 * Non-ASCII names keep their own slug (see authorSlug), which reaches a route
 * percent-encoded. Next decodes route params, but a slug that arrives encoded
 * anyway should still find its author rather than 404.
 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

async function findAuthorBySlug(slug: string): Promise<AuthorSummary | null> {
  const authors = collectAuthors(await fetchRepositoryPackages())
  const wanted = decodeSlug(slug)
  return authors.find((author) => author.slug === wanted) ?? null
}

/**
 * Unlike package pages these cost nothing to build - no archive is unpacked -
 * so they prerender whether or not the checkout is there to read.
 */
export async function generateStaticParams() {
  const authors = collectAuthors(await fetchRepositoryPackages())
  return authors.map((author) => ({ slug: author.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const author = await findAuthorBySlug((await params).slug)
  if (!author) return { title: 'Author not found' }

  const count = author.packages.length
  return {
    title: author.name,
    description: `${count} Mudlet ${count === 1 ? 'package' : 'packages'} by ${author.name}`,
  }
}

const Tile = ({ value, label }: { value: string; label: string }) => (
  <div className="card p-4">
    <p className="text-2xl font-semibold tabular-nums">{value}</p>
    <p className="mt-1 text-sm text-muted">{label}</p>
  </div>
)

export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params
  const author = await findAuthorBySlug(slug)
  if (!author) notFound()

  const count = author.packages.length

  // Anyone credited alongside them on a package, in as many packages as they
  // share - the people behind "Akaya, mods by Zooka" and the like.
  const collaborators = new Map<string, { name: string; slug: string; shared: number }>()
  for (const pkg of author.packages) {
    for (const name of parseAuthorNames(pkg.author)) {
      const otherSlug = authorSlug(name)
      if (!otherSlug || otherSlug === author.slug) continue
      const existing = collaborators.get(otherSlug)
      if (existing) existing.shared += 1
      else collaborators.set(otherSlug, { name, slug: otherSlug, shared: 1 })
    }
  }
  const sharedWith = [...collaborators.values()].sort(
    (a, b) => b.shared - a.shared || a.name.localeCompare(b.name, 'en')
  )

  const oldest = author.packages.reduce(
    (earliest, pkg) => (pkg.uploaded && pkg.uploaded < earliest ? pkg.uploaded : earliest),
    author.latestUpload
  )

  return (
    <main className="py-8">
      <Link href="/authors" className="text-sm text-muted hover:text-foreground">
        ← All authors
      </Link>

      <header className="mt-4">
        <h1 className="break-words text-3xl font-bold tracking-tight">{author.name}</h1>
        <p className="mt-1 text-muted">
          {count} {count === 1 ? 'package' : 'packages'} in the repository
          {author.aliases.length > 1 && (
            <> · also credited as {author.aliases.slice(1).join(', ')}</>
          )}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile value={String(count)} label={count === 1 ? 'package' : 'packages'} />
        <Tile value={formatDate(author.latestUpload) ?? '—'} label="last update" />
        <Tile value={formatDate(oldest) ?? '—'} label="first published" />
        <Tile value={String(sharedWith.length)} label="collaborators" />
      </div>

      {sharedWith.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Worked with</h2>
          <ul className="flex flex-wrap gap-2">
            {sharedWith.map((person) => (
              <li key={person.slug}>
                <Link
                  href={authorHref(person.slug)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm transition-colors hover:bg-surface-muted"
                >
                  {person.name}
                  <span className="text-xs tabular-nums text-muted">{person.shared}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Packages</h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {author.packages.map((pkg) => (
            <li key={pkg.filename ?? pkg.mpackage}>
              <PackageCard pkg={pkg} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
