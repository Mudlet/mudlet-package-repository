'use client'

import { useState } from 'react'

export const CopyableCommand = ({ command, label }: { command: string; label?: string }) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be blocked; the command stays selectable.
    }
  }

  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</p>}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted p-1 pl-3">
        {/* Long install URLs wrap rather than hiding behind a scrollbar. */}
        <code className="flex-1 whitespace-pre-wrap break-all py-1 font-mono text-sm leading-relaxed">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
