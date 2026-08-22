'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/packages', label: 'All packages' },
  { href: '/stats', label: 'API usage' },
  { href: '/upload', label: 'Upload package' },
]

export const Navigation = () => {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-1 sm:flex">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent(href) ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isCurrent(href)
                ? 'bg-surface-muted text-foreground'
                : 'text-muted hover:bg-surface-muted hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile */}
      <nav className="sm:hidden">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="rounded-md p-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            {isMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute inset-x-0 top-full border-b border-border bg-surface p-2 shadow-card">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent(href) ? 'page' : undefined}
                onClick={() => setIsMenuOpen(false)}
                className={`block rounded-md px-3 py-2 text-base font-medium transition-colors ${
                  isCurrent(href)
                    ? 'bg-surface-muted text-foreground'
                    : 'text-muted hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
