import Link from 'next/link'
import { PackageCard } from './components/PackageCard'
import { IntroSection } from './components/IntroSection'
import { ProgressBar } from './components/ProgressBar'
import { CopyableCommand } from './components/CopyableCommand'
import { fetchRepositoryPackages } from './lib/packages'

/**
 * The index used to carry this window on its own fetch; read off the checkout
 * there is no fetch to carry it, so the page says how fresh it wants to be.
 */
export const revalidate = 600

/** The next round number to aim for, so the bar keeps meaning as the repo grows. */
const nextMilestone = (count: number) => Math.max(50, Math.ceil((count + 1) / 50) * 50)

export default async function Home() {
  const packages = await fetchRepositoryPackages()
  const authors = new Set(packages.map((pkg) => pkg.author).filter(Boolean)).size
  const goal = nextMilestone(packages.length)

  const recent = packages
    .slice()
    .sort((a, b) => b.uploaded - a.uploaded)
    .slice(0, 6)

  return (
    <main className="py-10">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Mudlet packages</h1>
        <p className="mt-4 text-lg text-muted">
          Game interfaces, mappers, tutorials and helper scripts for{' '}
          <a href="https://www.mudlet.org/" className="text-accent hover:text-accent-hover">
            Mudlet
          </a>
          , made by the community. Install them from inside Mudlet with <code className="code-chip">mpkg</code>,
          or download them here.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/packages"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Browse {packages.length} packages
          </Link>
          <Link
            href="/upload"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
          >
            Upload your package
          </Link>
        </div>

      </section>

      {/* Full page width: the install line is long, so it should not need to scroll. */}
      <div className="mt-8">
        <CopyableCommand
          label="Get mpkg (paste into Mudlet's command line)"
          command={'lua installPackage("https://github.com/Mudlet/mudlet-package-repository/raw/refs/heads/main/packages/mpkg.mpackage")'}
        />
      </div>

      <section className="mt-12">
        <IntroSection />
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Recent uploads</h2>
          <Link href="/packages" className="text-sm text-accent hover:text-accent-hover">
            See all
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((pkg) => (
            <li key={pkg.filename ?? pkg.mpackage}>
              <PackageCard pkg={pkg} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <ProgressBar current={packages.length} goal={goal} authors={authors} />
      </section>
    </main>
  )
}
