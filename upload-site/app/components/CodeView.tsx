'use client'

import { useMemo } from 'react'
import hljs from 'highlight.js/lib/core'
import lua from 'highlight.js/lib/languages/lua'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import markdown from 'highlight.js/lib/languages/markdown'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import yaml from 'highlight.js/lib/languages/yaml'
import bash from 'highlight.js/lib/languages/bash'
import plaintext from 'highlight.js/lib/languages/plaintext'

// Only the languages a Mudlet package realistically contains are registered,
// which keeps the client bundle a fraction of the full highlight.js.
const LANGUAGES = { lua, json, xml, markdown, css, javascript, typescript, yaml, bash, plaintext }
for (const [name, definition] of Object.entries(LANGUAGES)) {
  if (!hljs.getLanguage(name)) hljs.registerLanguage(name, definition)
}

interface CodeViewProps {
  source: string
  language?: string
  className?: string
}

/**
 * Highlighting turns every token into its own element, so a large file can
 * produce enough DOM to lock the main thread. Past this point the preview shows
 * the head of the file and points at the raw copy.
 */
const MAX_RENDER_CHARS = 60_000

export const CodeView = ({ source, language = 'lua', className = '' }: CodeViewProps) => {
  const clipped = source.length > MAX_RENDER_CHARS
  const shown = clipped ? source.slice(0, MAX_RENDER_CHARS) : source

  const html = useMemo(() => {
    const resolved = hljs.getLanguage(language) ? language : 'plaintext'
    try {
      return hljs.highlight(shown, { language: resolved }).value
    } catch {
      // Fall back to the unhighlighted source rather than losing the file.
      return null
    }
  }, [shown, language])

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <pre className="hljs-view min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {html === null ? (
          <code>{shown}</code>
        ) : (
          // hljs.highlight escapes the source it is given.
          <code dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </pre>
      {clipped && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted">
          Showing the first {Math.round(MAX_RENDER_CHARS / 1000)} KB of{' '}
          {Math.round(source.length / 1000)} KB.
        </p>
      )}
    </div>
  )
}
