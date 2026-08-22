'use client'

import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'
import { authorHref } from '@/app/lib/authors'
import { formatDate } from '@/app/lib/urls'

/** What the index page needs about an author - not their packages in full. */
export interface AuthorListEntry {
  slug: string
  name: string
  /** Other spellings of the name, so a search for either finds them. */
  aliases: string[]
  packageCount: number
  latestUpload: number
  /** A few package names, as a hint of what this author works on. */
  sample: string[]
}

const SORTS = {
  packages: 'Most packages',
  name: 'Name (A-Z)',
  recent: 'Recently active',
} as const

type SortKey = keyof typeof SORTS

export const AuthorBrowser = ({ authors }: { authors: AuthorListEntry[] }) => {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('packages')
  const deferredQuery = useDeferredValue(query)

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    const filtered = needle
      ? authors.filter((author) =>
          [...author.aliases, ...author.sample].some((text) =>
            text.toLowerCase().includes(needle)
          )
        )
      : authors.slice()

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
      if (sortBy === 'recent') return b.latestUpload - a.latestUpload
      return b.packageCount - a.packageCount || a.name.localeCompare(b.name, 'en')
    })
  }, [authors, deferredQuery, sortBy])

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
            placeholder="Search by author or package name"
            aria-label="Search authors"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortKey)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-4 text-sm text-muted" aria-live="polite">
        {visible.length} of {authors.length} authors
      </p>

      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium">No authors match “{query.trim()}”.</p>
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
          {visible.map((author) => (
            <li key={author.slug}>
              <Link
                href={authorHref(author.slug)}
                className="card-interactive group flex h-full flex-col gap-2 p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="min-w-0 break-words font-semibold text-foreground group-hover:text-accent">
                    {author.name}
                  </h2>
                  <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs tabular-nums text-muted">
                    {author.packageCount}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm text-muted">{author.sample.join(' · ')}</p>

                {formatDate(author.latestUpload) && (
                  <p className="mt-auto pt-1 text-xs text-muted">
                    Last update {formatDate(author.latestUpload)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
