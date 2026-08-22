'use client'

import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'
import {
  ApiUsageEntry,
  ApiUsageFunction,
  ApiUsagePackage,
  documentationUrl,
} from '@/app/lib/apiUsage'

type View = 'used' | 'unused' | 'beyond' | 'packages'

const VIEWS: { value: View; label: string }[] = [
  { value: 'used', label: 'Most used' },
  { value: 'unused', label: 'Never used' },
  { value: 'beyond', label: 'Other libraries' },
  { value: 'packages', label: 'By package' },
]

const BLURBS: Record<View, string> = {
  used: 'Mudlet functions, ranked by how many packages call them. Namespaced APIs - Geyser, table.save, io.exists - count here too.',
  unused:
    'Documented functions no package in the repository calls. Some are new, some are niche, some are simply forgotten.',
  beyond:
    'Calls to things outside both Lua and Mudlet: libraries Mudlet ships without documenting as its own (lfs, rex), libraries packages bring themselves, and globals they expect from elsewhere.',
  packages: 'Packages by how much of the Mudlet API they touch.',
}

/** A bar behind the count, scaled against the busiest row in the view. */
const Bar = ({ value, max }: { value: number; max: number }) => (
  <div className="h-1.5 w-full rounded-full bg-surface-muted" aria-hidden="true">
    <div
      className="h-full rounded-full bg-accent"
      style={{ width: `${Math.max(2, Math.round((value / max) * 100))}%` }}
    />
  </div>
)

const UsageTable = ({ entries }: { entries: ApiUsageEntry[] }) => {
  const max = entries[0]?.packages ?? 1

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3">
          <div className="min-w-0">
            <a
              href={documentationUrl(entry)}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-sm text-accent hover:text-accent-hover"
            >
              {entry.name}
            </a>
            {entry.signature && (
              <p className="mt-0.5 break-all font-mono text-xs text-muted">{entry.signature}</p>
            )}
            <div className="mt-2 max-w-xs">
              <Bar value={entry.packages} max={max} />
            </div>
          </div>
          <div className="whitespace-nowrap text-right text-sm">
            <p className="font-semibold tabular-nums">{entry.packages} packages</p>
            <p className="text-xs text-muted tabular-nums">
              {entry.calls.toLocaleString('en-GB')} calls
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

const UnusedList = ({ entries }: { entries: ApiUsageFunction[] }) => (
  <ul className="grid grid-cols-1 gap-x-6 gap-y-3 py-3 sm:grid-cols-2 lg:grid-cols-3">
    {entries.map((entry) => (
      <li key={entry.name} className="min-w-0">
        <a
          href={documentationUrl(entry)}
          target="_blank"
          rel="noreferrer"
          className="break-all font-mono text-sm text-accent hover:text-accent-hover"
        >
          {entry.name}
        </a>
        {entry.signature && (
          <p className="break-all font-mono text-xs text-muted">{entry.signature}</p>
        )}
      </li>
    ))}
  </ul>
)

const PackageList = ({ entries }: { entries: ApiUsagePackage[] }) => {
  const max = entries[0]?.functions ?? 1

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.slug} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3">
          <div className="min-w-0">
            <Link
              href={`/packages/${entry.slug}`}
              className="break-words font-medium text-accent hover:text-accent-hover"
            >
              {entry.name}
            </Link>
            {entry.top.length > 0 && (
              <p className="mt-0.5 break-all font-mono text-xs text-muted">
                {entry.top.join(', ')}
              </p>
            )}
            <div className="mt-2 max-w-xs">
              <Bar value={entry.functions} max={max} />
            </div>
          </div>
          <div className="whitespace-nowrap text-right text-sm">
            <p className="font-semibold tabular-nums">{entry.functions} functions</p>
            <p className="text-xs text-muted tabular-nums">
              {entry.calls.toLocaleString('en-GB')} calls
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export const ApiUsageExplorer = ({
  functions,
  unused,
  beyond,
  packages,
}: {
  functions: ApiUsageEntry[]
  unused: ApiUsageFunction[]
  beyond: ApiUsageEntry[]
  packages: ApiUsagePackage[]
}) => {
  const [view, setView] = useState<View>('used')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    const rows =
      view === 'used' ? functions : view === 'unused' ? unused : view === 'beyond' ? beyond : packages
    if (!needle) return rows
    return rows.filter((row) => row.name.toLowerCase().includes(needle))
  }, [view, deferredQuery, functions, unused, beyond, packages])

  const total =
    view === 'used'
      ? functions.length
      : view === 'unused'
        ? unused.length
        : view === 'beyond'
          ? beyond.length
          : packages.length

  return (
    <section>
      <div
        role="tablist"
        aria-label="What to show"
        className="mb-4 flex flex-wrap gap-1 border-b border-border"
      >
        {VIEWS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              view === value
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-muted">{BLURBS[view]}</p>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={view === 'packages' ? 'Search packages' : 'Search function names'}
        aria-label={view === 'packages' ? 'Search packages' : 'Search function names'}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
      />

      <p className="mt-3 text-sm text-muted" aria-live="polite">
        {visible.length} of {total}
      </p>

      {visible.length === 0 ? (
        <p className="card mt-3 p-10 text-center text-sm text-muted">
          Nothing matches “{query.trim()}”.
        </p>
      ) : view === 'unused' ? (
        <UnusedList entries={visible as ApiUsageFunction[]} />
      ) : view === 'packages' ? (
        <PackageList entries={visible as ApiUsagePackage[]} />
      ) : (
        <UsageTable entries={visible as ApiUsageEntry[]} />
      )}
    </section>
  )
}
