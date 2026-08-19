'use client'

import { motion } from 'framer-motion'

interface ProgressBarProps {
  current: number
  goal: number
  authors: number
}

export function ProgressBar({ current, goal, authors }: ProgressBarProps) {
  const percentage = Math.min((current / goal) * 100, 100)
  const remaining = Math.max(goal - current, 0)

  const message =
    remaining === 0
      ? '🎉 Milestone reached — thank you everyone!'
      : remaining <= 5
        ? `🚀 Only ${remaining} to go until ${goal} packages!`
        : `⭐ ${remaining} more packages to reach ${goal}.`

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Community packages</h2>
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{current}</span> packages from{' '}
          <span className="font-semibold text-foreground">{authors}</span> authors
        </p>
      </div>

      <div
        className="mt-4 h-3 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-label={`${current} of ${goal} packages`}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      <p className="mt-3 text-sm text-muted">{message}</p>
    </div>
  )
}
