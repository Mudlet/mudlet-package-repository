import Link from 'next/link'
import { CopyableCommand } from './CopyableCommand'

export function IntroSection() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="card p-6">
        <h2 className="text-xl font-semibold">What is this?</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          <code className="code-chip">mpkg</code> is an additional package manager for{' '}
          <a href="https://www.mudlet.org/" className="text-accent hover:text-accent-hover">
            Mudlet
          </a>{' '}
          which allows you to install, remove, update and search for packages in this website.
          Packages like game interfaces, mappers, tutorials and helpful functions, all created by
          Mudlet users can now be found in one place —{' '}
          <Link href="/packages" className="text-accent hover:text-accent-hover">
            here
          </Link>
          .
        </p>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold">Further help</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          Once installed access the help via:
        </p>
        <div className="mt-3">
          <CopyableCommand command="mpkg help" />
        </div>
      </section>

      <section className="card p-6 md:col-span-2">
        <h2 className="text-xl font-semibold">Share your creations 🌟</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          Created something cool for Mudlet? Share it with{' '}
          <a href="https://stats.mudlet.org" className="text-accent hover:text-accent-hover">
            thousands of players
          </a>
          !
        </p>
        <ul className="mt-3 grid gap-1.5 text-sm text-foreground/90 sm:grid-cols-2">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-accent">
              →
            </span>
            Get automatic updates for your package
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-accent">
              →
            </span>
            Reach users through this website
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-accent">
              →
            </span>
            Or through the quick <code className="code-chip">mpkg install</code> commands
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-accent">
              →
            </span>
            Join our growing collection of Mudlet community tools
          </li>
        </ul>
        <Link
          href="/upload"
          className="mt-4 inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
        >
          Upload your package
        </Link>
      </section>
    </div>
  )
}
