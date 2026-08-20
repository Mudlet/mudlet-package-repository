'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const OPTIONS = [
  {
    value: 'system',
    label: 'System theme',
    icon: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
  },
  {
    value: 'light',
    label: 'Light theme',
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    value: 'dark',
    label: 'Dark theme',
    icon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  },
] as const

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // `theme` is only meaningful once we're on the client; render a neutral
  // placeholder of the same size until then to avoid a hydration mismatch.
  useEffect(() => setMounted(true), [])

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-muted p-0.5"
      role="radiogroup"
      aria-label="Colour theme"
    >
      {OPTIONS.map((option) => {
        const isActive = mounted && theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={`rounded-md p-1.5 transition-colors ${
              isActive
                ? 'bg-surface text-foreground shadow-card'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {option.icon}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
