'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { UploadedPackageMetadata, UploadedPackageSortByOptions } from '@/app/lib/types'
import { PackageCard } from './PackageCard'

const SORTS = [
  { value: UploadedPackageSortByOptions.uploaded, label: 'Recently updated' },
  { value: UploadedPackageSortByOptions.mpackage, label: 'Name (A-Z)' },
  { value: UploadedPackageSortByOptions.author, label: 'Author (A-Z)' },
]

const matches = (pkg: UploadedPackageMetadata, query: string) =>
  [pkg.mpackage, pkg.title, pkg.author, pkg.description]
    .some((field) => field?.toLowerCase().includes(query))

export const PackageBrowser = ({ packages }: { packages: UploadedPackageMetadata[] }) => {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<UploadedPackageSortByOptions>(
    UploadedPackageSortByOptions.mpackage
  )
  const deferredQuery = useDeferredValue(query)

  const authorCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const pkg of packages) {
      if (!pkg.author) continue
      counts.set(pkg.author, (counts.get(pkg.author) ?? 0) + 1)
    }
    return counts
  }, [packages])

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    const filtered = needle ? packages.filter((pkg) => matches(pkg, needle)) : packages.slice()

    return filtered.sort((a, b) =>
      sortBy === UploadedPackageSortByOptions.uploaded
        ? b.uploaded - a.uploaded
        : (a[sortBy]?.toLowerCase() || '').localeCompare(b[sortBy]?.toLowerCase() || '')
    )
  }, [packages, deferredQuery, sortBy])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, author or description"
            aria-label="Search packages"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as UploadedPackageSortByOptions)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-4 text-sm text-muted" aria-live="polite">
        {visible.length} of {packages.length} packages
      </p>

      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium">No packages match “{query.trim()}”.</p>
          <p className="mt-1 text-sm text-muted">
            Try a shorter search, or{' '}
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-accent hover:text-accent-hover"
            >
              clear the search
            </button>
            .
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((pkg) => (
            <li key={pkg.filename ?? pkg.mpackage}>
              <PackageCard pkg={pkg} authorPackageCount={authorCounts.get(pkg.author ?? '') ?? 0} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
