'use client'

import { useRef, useState } from 'react'

interface DragToInstallProps {
  packageName: string
  downloadUrl: string
}

/**
 * The site's package glyph (same cube as the header mark), reused here so the
 * thing being dragged reads as "a package" at a glance.
 */
const PackageGlyph = ({ className }: { className: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </svg>
)

/**
 * A tile you drag straight from the page onto a Mudlet profile's main window.
 *
 * Mudlet 4.11+ raises `sysDropUrlEvent` for any http(s) URL dropped on the main
 * console, and its built-in Lua handler feeds that URL to installPackage() - so
 * the drop installs the package with no download step in between. The payload
 * is only the URL, which a browser already attaches to a dragged link; setting
 * it explicitly just makes the whole tile behave identically wherever the drag
 * begins.
 */
export const DragToInstall = ({ packageName, downloadUrl }: DragToInstallProps) => {
  const ghost = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const startDrag = (event: React.DragEvent<HTMLAnchorElement>) => {
    event.dataTransfer.setData('text/plain', downloadUrl)
    event.dataTransfer.setData('text/uri-list', downloadUrl)
    // Mudlet reads a plain drop as "install as package" and a ctrl-drop as
    // "install as module", so both actions have to stay allowed.
    event.dataTransfer.effectAllowed = 'copyLink'
    if (ghost.current) {
      event.dataTransfer.setDragImage(ghost.current, 16, 16)
    }
    setDragging(true)
  }

  return (
    // Dragging needs a pointer, so the tile stays out of the way on touch.
    <div className="[@media(hover:none)]:hidden">
      {/*
        Matches the height of the method switcher next to it, so this tile and
        the command box line up along their tops.
      */}
      <div className="mb-2 flex h-7 items-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Or drag it in
        </p>
      </div>

      <a
        href={downloadUrl}
        draggable
        onDragStart={startDrag}
        onDragEnd={() => setDragging(false)}
        title={`Drag onto Mudlet's main window to install ${packageName}`}
        className={`flex cursor-grab select-none items-center gap-3 rounded-lg border border-dashed border-accent/40 bg-accent/5 px-3 py-2 transition-colors hover:border-accent hover:bg-accent/10 active:cursor-grabbing ${
          dragging ? 'opacity-40' : ''
        }`}
      >
        <PackageGlyph className="h-7 w-7 shrink-0 text-accent" />
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-tight">Drag into Mudlet</span>
          <span className="block text-xs leading-tight text-muted">
            Drop it on the main window
          </span>
        </span>
      </a>

      <p className="mt-1.5 text-xs text-muted">
        Mudlet 4.11+ · click to download instead
      </p>

      {/*
        The drag image has to be a rendered element, so it is parked off-screen
        rather than hidden - a display:none or opacity:0 node drags as nothing.
      */}
      <div
        ref={ghost}
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] top-0 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-card"
      >
        <PackageGlyph className="h-4 w-4 shrink-0 text-accent" />
        <span className="whitespace-nowrap font-mono text-xs">{packageName}</span>
      </div>
    </div>
  )
}
