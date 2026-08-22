import { AuthorBrowser, AuthorListEntry } from '../components/AuthorBrowser'
import { collectAuthors } from '../lib/authors'
import { fetchRepositoryPackages } from '../lib/packages'

export const metadata = {
  title: 'Authors',
  description: 'Everyone who has published a package for the Mudlet MUD client',
}

/** Same reasoning as the package listing: the checkout read carries no window. */
export const revalidate = 600

export default async function AuthorsPage() {
  const packages = await fetchRepositoryPackages()

  // Only what a card shows is handed to the client - the full package objects
  // would be the whole index over again, once per author who appears in it.
  const authors: AuthorListEntry[] = collectAuthors(packages).map((author) => ({
    slug: author.slug,
    name: author.name,
    aliases: author.aliases,
    packageCount: author.packages.length,
    latestUpload: author.latestUpload,
    sample: author.packages.slice(0, 4).map((pkg) => pkg.mpackage ?? '').filter(Boolean),
  }))

  return (
    <main className="py-8">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Authors</h1>
      <p className="mb-8 max-w-3xl text-muted">
        Everyone credited on a package in the repository. Open an author to see what they have
        made, and who they made it with.
      </p>
      <AuthorBrowser authors={authors} />
    </main>
  )
}
