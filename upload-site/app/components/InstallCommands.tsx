'use client'

import { useState } from 'react'
import { CopyableCommand } from './CopyableCommand'

interface InstallCommandsProps {
  packageName: string
  downloadUrl: string
}

const METHODS = [
  { id: 'mpkg', label: 'mpkg', hint: 'Mudlet 4.20+ with mpkg installed' },
  { id: 'lua', label: 'installPackage', hint: 'Any Mudlet version, no mpkg needed' },
] as const

export const InstallCommands = ({ packageName, downloadUrl }: InstallCommandsProps) => {
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('mpkg')

  const command =
    method === 'mpkg'
      ? `mpkg install ${packageName}`
      : `lua installPackage("${downloadUrl}")`

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Install from Mudlet&apos;s command line
        </p>
        <div
          className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-muted p-0.5"
          role="tablist"
          aria-label="Installation method"
        >
          {METHODS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={method === option.id}
              title={option.hint}
              onClick={() => setMethod(option.id)}
              className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                method === option.id
                  ? 'bg-surface text-foreground shadow-card'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <CopyableCommand command={command} />
      <p className="mt-1.5 text-xs text-muted">
        {METHODS.find((option) => option.id === method)?.hint}
      </p>
    </div>
  )
}
