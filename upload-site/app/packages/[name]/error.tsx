'use client'

import Link from 'next/link'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="py-16">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold">This package could not be loaded</h1>
        <p className="mt-2 text-sm text-muted">
          The package index or archive could not be reached. This is usually temporary.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover"
          >
            Try again
          </button>
          <Link
            href="/packages"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            All packages
          </Link>
        </div>
      </div>
    </main>
  )
}
