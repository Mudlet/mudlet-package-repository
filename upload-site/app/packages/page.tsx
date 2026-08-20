import { PackageBrowser } from '../components/PackageBrowser'
import { fetchRepositoryPackages } from '../lib/packages'

export const metadata = {
  title: 'All packages',
  description: 'Browse every package available for the Mudlet MUD client',
}

/** Same reasoning as the home page: the checkout read carries no window. */
export const revalidate = 600

export default async function PackagesPage() {
  const packages = await fetchRepositoryPackages()

  return (
    <main className="py-8">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">All packages</h1>
      <p className="mb-8 text-muted">
        Everything published to the repository. Open a package to see what it installs.
      </p>
      <PackageBrowser packages={packages} />
    </main>
  )
}
