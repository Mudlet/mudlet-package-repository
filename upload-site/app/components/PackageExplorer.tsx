'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PackageContents,
  PackageEntity,
  PackageEntityKind,
  PackageFileEntry,
} from '@/app/lib/types'
import { formatBytes } from '@/app/lib/urls'
import { languageForFile, previewKind } from '@/app/lib/fileTypes'
import { CodeView } from './CodeView'
import { EntityIcon, FileIcon, FolderIcon } from './icons'

const KIND_LABELS: Record<PackageEntityKind, [string, string]> = {
  [PackageEntityKind.trigger]: ['Trigger', 'Triggers'],
  [PackageEntityKind.alias]: ['Alias', 'Aliases'],
  [PackageEntityKind.script]: ['Script', 'Scripts'],
  [PackageEntityKind.timer]: ['Timer', 'Timers'],
  [PackageEntityKind.key]: ['Key', 'Keys'],
  [PackageEntityKind.button]: ['Button', 'Buttons'],
}

const KIND_ORDER = [
  PackageEntityKind.trigger,
  PackageEntityKind.alias,
  PackageEntityKind.script,
  PackageEntityKind.timer,
  PackageEntityKind.key,
  PackageEntityKind.button,
]

type Selection =
  | { type: 'entity'; entity: PackageEntity }
  | { type: 'file'; file: PackageFileEntry }

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // Clipboard access can be blocked; the text stays selectable.
        }
      }}
      className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

interface FileNode {
  name: string
  path: string
  size: number
  isDirectory: boolean
  children: FileNode[]
}

/**
 * Zip entries are flat paths; packages nest their assets (`.mudlet/Icon/x.png`,
 * `images/ui/panel.png`), so they are rebuilt into a tree to browse.
 */
function buildFileTree(files: PackageFileEntry[]): FileNode[] {
  const roots: FileNode[] = []
  const directories = new Map<string, FileNode>()

  const directoryFor = (path: string): FileNode | null => {
    if (!path) return null
    const existing = directories.get(path)
    if (existing) return existing

    const slash = path.lastIndexOf('/')
    const node: FileNode = {
      name: path.slice(slash + 1),
      path,
      size: 0,
      isDirectory: true,
      children: [],
    }
    directories.set(path, node)

    const parent = directoryFor(path.slice(0, Math.max(slash, 0)))
    ;(parent ? parent.children : roots).push(node)
    return node
  }

  for (const file of files) {
    const slash = file.path.lastIndexOf('/')
    const parent = directoryFor(slash === -1 ? '' : file.path.slice(0, slash))
    const node: FileNode = {
      name: file.path.slice(slash + 1),
      path: file.path,
      size: file.size,
      isDirectory: false,
      children: [],
    }
    ;(parent ? parent.children : roots).push(node)
  }

  const sort = (nodes: FileNode[]): FileNode[] => {
    nodes.sort((a, b) =>
      a.isDirectory === b.isDirectory
        ? a.name.localeCompare(b.name)
        : a.isDirectory
          ? -1
          : 1
    )
    nodes.forEach((node) => sort(node.children))
    return nodes
  }

  return sort(roots)
}

const FileRow = ({
  node,
  depth,
  selection,
  onSelect,
  expanded,
  toggleFolder,
  selectable,
  forceOpen,
}: {
  node: FileNode
  depth: number
  selection: Selection | null
  onSelect: (selection: Selection) => void
  expanded: Set<string>
  toggleFolder: (id: string) => void
  selectable: boolean
  forceOpen: boolean
}) => {
  const id = `dir:${node.path}`
  // A filter reveals matches wherever they sit, without disturbing what the
  // reader expanded by hand.
  const isOpen = expanded.has(id) || forceOpen
  const isSelected = selection?.type === 'file' && selection.file.path === node.path

  return (
    <li>
      <button
        type="button"
        disabled={!node.isDirectory && !selectable}
        onClick={() =>
          node.isDirectory
            ? toggleFolder(id)
            : onSelect({
                type: 'file',
                file: { path: node.path, size: node.size, isDirectory: false },
              })
        }
        aria-expanded={node.isDirectory ? isOpen : undefined}
        className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm transition-colors disabled:cursor-default ${
          isSelected ? 'bg-accent/10 text-accent' : 'enabled:hover:bg-surface-muted'
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <span className="w-3 shrink-0 text-muted">
          {node.isDirectory && <Chevron open={isOpen} />}
        </span>
        {node.isDirectory ? <FolderIcon open={isOpen} /> : <FileIcon path={node.path} />}
        <span className="min-w-0 flex-1 truncate font-mono text-xs" title={node.path}>
          {node.name}
        </span>
        {!node.isDirectory && (
          <span className="shrink-0 text-[11px] text-muted">{formatBytes(node.size)}</span>
        )}
      </button>

      {node.isDirectory && isOpen && (
        <ul>
          {node.children.map((child) => (
            <FileRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selection={selection}
              onSelect={onSelect}
              expanded={expanded}
              toggleFolder={toggleFolder}
              selectable={selectable}
              forceOpen={forceOpen}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

/** Keeps folders whose name or descendants match the filter. */
function filterEntities(entities: PackageEntity[], needle: string): PackageEntity[] {
  if (!needle) return entities
  return entities
    .map((entity) => {
      const children = filterEntities(entity.children, needle)
      const matches = entity.name.toLowerCase().includes(needle)
      if (!matches && children.length === 0) return null
      return { ...entity, children }
    })
    .filter(Boolean) as PackageEntity[]
}

const EntityRow = ({
  entity,
  depth,
  selection,
  onSelect,
  expanded,
  toggleFolder,
  forceOpen,
}: {
  entity: PackageEntity
  depth: number
  selection: Selection | null
  onSelect: (selection: Selection) => void
  expanded: Set<string>
  toggleFolder: (id: string) => void
  forceOpen: boolean
}) => {
  const id = entity.id
  const isOpen = expanded.has(id) || forceOpen
  const isSelected = selection?.type === 'entity' && selection.entity.id === entity.id

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          // Groups can carry a script of their own, so selecting one is
          // meaningful; expanding and selecting happen together.
          if (entity.isFolder) toggleFolder(id)
          if (!entity.isFolder || entity.hasScript) onSelect({ type: 'entity', entity })
        }}
        aria-expanded={entity.isFolder ? isOpen : undefined}
        className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm transition-colors ${
          isSelected ? 'bg-accent/10 text-accent' : 'hover:bg-surface-muted'
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <span className="w-3 shrink-0 text-muted">{entity.isFolder && <Chevron open={isOpen} />}</span>
        {entity.isFolder ? <FolderIcon open={isOpen} /> : <EntityIcon kind={entity.kind} />}
        <span
          className={`min-w-0 flex-1 truncate ${entity.isFolder ? 'font-medium' : ''}`}
          title={entity.name}
        >
          {entity.name}
        </span>
        {entity.isFolder && entity.hasScript && (
          <span
            className="shrink-0 rounded-full bg-surface-muted px-1.5 text-[10px] text-muted"
            title="This group has its own script"
          >
            script
          </span>
        )}
        {entity.detail && (
          // The pattern is secondary to the name, so it gives up space first.
          <span
            className="max-w-[45%] shrink truncate font-mono text-[11px] text-muted"
            title={entity.detail}
          >
            {entity.detail}
          </span>
        )}
        {!entity.isActive && (
          <span className="ml-auto shrink-0 rounded-full bg-surface-muted px-1.5 text-[10px] text-muted">
            off
          </span>
        )}
      </button>

      {entity.isFolder && isOpen && entity.children.length > 0 && (
        <ul>
          {entity.children.map((child, index) => (
            <EntityRow
              key={child.id}
              entity={child}
              depth={depth + 1}
              selection={selection}
              onSelect={onSelect}
              expanded={expanded}
              toggleFolder={toggleFolder}
              forceOpen={forceOpen}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

const EntityViewer = ({ entity, scriptUrl }: { entity: PackageEntity; scriptUrl?: string }) => {
  const [singular] = KIND_LABELS[entity.kind]
  // Scripts are inlined only in the upload preview; elsewhere they are fetched.
  const [fetched, setFetched] = useState<{ script: string; truncated: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const needsFetch = entity.hasScript && !entity.script && Boolean(scriptUrl)

  useEffect(() => {
    if (!needsFetch || !scriptUrl) return
    const controller = new AbortController()
    setFetched(null)
    setError(null)

    fetch(scriptUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((body) => setFetched({ script: body.script, truncated: Boolean(body.truncated) }))
      .catch((err) => {
        if (err.name !== 'AbortError') setError('This script could not be loaded.')
      })

    return () => controller.abort()
  }, [scriptUrl, needsFetch])

  const script = entity.script ?? fetched?.script ?? null
  const truncated = entity.scriptTruncated || Boolean(fetched?.truncated)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border p-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted">
            {singular}
            {entity.isFolder && ' group'}
            {!entity.isActive && ' · disabled'}
          </p>
          <h3 className="truncate font-semibold">{entity.name}</h3>
        </div>
        {script && <CopyButton value={script} />}
      </div>

      {(entity.facts.length > 0 || entity.command) && (
        <dl className="space-y-1 border-b border-border px-3 py-2 text-xs">
          {entity.facts.map((fact, index) => (
            <div key={`${fact.label}-${index}`} className="flex gap-2">
              <dt className="w-28 shrink-0 text-muted">{fact.label}</dt>
              <dd className={`min-w-0 break-all ${fact.mono ? 'font-mono' : ''}`}>{fact.value}</dd>
            </div>
          ))}
          {entity.command && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-muted">Sends</dt>
              <dd className="min-w-0 break-all font-mono">{entity.command}</dd>
            </div>
          )}
        </dl>
      )}

      {script ? (
        <>
          <CodeView source={script} language="lua" className="min-h-0 flex-1" />
          {truncated && (
            <p className="border-t border-border p-2 text-xs text-muted">
              Source truncated — download the package to read the rest.
            </p>
          )}
        </>
      ) : error ? (
        <p className="p-4 text-sm text-muted">{error}</p>
      ) : entity.hasScript ? (
        <p className="p-4 text-sm text-muted">
          {scriptUrl ? 'Loading…' : 'This item has a script; it is shown once the package is published.'}
        </p>
      ) : (
        <p className="p-4 text-sm text-muted">
          {entity.command ? 'This item runs no Lua — it just sends that command.' : 'This item has no script.'}
        </p>
      )}
    </div>
  )
}

/**
 * A package that plays sounds is one you want to hear before installing, so
 * they play in place rather than only downloading. Not everything a package
 * ships can be decoded by a browser - the older sound packs carry ADPCM .wav -
 * and the file route turns down anything over its preview cap, so a failed
 * load falls back to the same download line the binary case offers. Mounted
 * under a key of the url, so selecting another sound starts from scratch.
 */
const AudioPreview = ({ url }: { url: string }) => {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="p-4 text-sm text-muted">
        <p>This sound could not be played here.</p>
        <a href={url} className="mt-2 inline-block text-accent hover:text-accent-hover">
          Download it instead →
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 bg-surface-muted p-6">
      <svg
        className="h-16 w-16 text-icon-audio opacity-40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11 5 6.5 9H3v6h3.5L11 19z" />
        <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.8 6.5a7.5 7.5 0 0 1 0 11" />
      </svg>
      <audio
        controls
        preload="metadata"
        src={url}
        onError={() => setFailed(true)}
        className="w-full max-w-sm"
      />
    </div>
  )
}

const FileViewer = ({ file, url }: { file: PackageFileEntry; url: string }) => {
  const kind = previewKind(file.path)
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (kind !== 'text') return
    const controller = new AbortController()
    setText(null)
    setError(null)

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.text()
      })
      .then((body) => setText(body.slice(0, 200_000)))
      .catch((err) => {
        if (err.name !== 'AbortError') setError('This file could not be loaded.')
      })

    return () => controller.abort()
  }, [url, kind])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border p-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted">File · {formatBytes(file.size)}</p>
          <h3 className="truncate font-mono text-sm font-semibold" title={file.path}>
            {file.path}
          </h3>
        </div>
        <div className="flex shrink-0 gap-2">
          {text && <CopyButton value={text} />}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
          >
            Raw
          </a>
        </div>
      </div>

      {kind === 'image' && (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-surface-muted p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={file.path}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      {kind === 'audio' && <AudioPreview key={url} url={url} />}

      {kind === 'text' &&
        (error ? (
          <p className="p-4 text-sm text-muted">{error}</p>
        ) : text === null ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : (
          <CodeView source={text} language={languageForFile(file.path)} className="min-h-0 flex-1" />
        ))}

      {kind === 'binary' && (
        <div className="p-4 text-sm text-muted">
          <p>No preview for this file type.</p>
          <a href={url} className="mt-2 inline-block text-accent hover:text-accent-hover">
            Download it instead →
          </a>
        </div>
      )}
    </div>
  )
}

interface PackageExplorerProps {
  contents: PackageContents
  /**
   * Slug of the published package, used to fetch individual files for preview.
   * Omitted for packages that are not in the repository yet (upload preview),
   * where files are listed but cannot be opened.
   */
  slug?: string
}

export const PackageExplorer = ({ contents, slug }: PackageExplorerProps) => {
  const fileUrl = useMemo(
    () =>
      slug
        ? (path: string) => `/api/packages/${slug}/file?path=${encodeURIComponent(path)}`
        : undefined,
    [slug]
  )

  const [selection, setSelection] = useState<Selection | null>(null)
  // How a package lays its files out is part of what a reader came to see, so
  // folders start open however many there are - collapsing is the deliberate act.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    const files = contents.files.filter((file) => !file.isDirectory)
    for (const file of files) {
      let path = file.path
      let slash = path.lastIndexOf('/')
      while (slash > -1) {
        path = path.slice(0, slash)
        initial.add(`dir:${path}`)
        slash = path.lastIndexOf('/')
      }
    }
    return initial
  })
  const [filter, setFilter] = useState('')

  const needle = filter.trim().toLowerCase()

  const groups = useMemo(
    () =>
      KIND_ORDER.map((kind) => ({
        kind,
        entities: filterEntities(
          contents.entities.filter((entity) => entity.kind === kind),
          needle
        ),
        count: contents.counts[kind],
      })).filter((group) => group.entities.length > 0),
    [contents, needle]
  )

  const files = useMemo(
    () =>
      contents.files
        .filter((file) => !file.isDirectory)
        .filter((file) => !needle || file.path.toLowerCase().includes(needle)),
    [contents.files, needle]
  )

  const fileTree = useMemo(() => buildFileTree(files), [files])

  // Open on something useful rather than an empty pane.
  useEffect(() => {
    if (selection) return
    const firstScript = contents.entities.find((entity) => !entity.isFolder && entity.hasScript)
    if (firstScript) {
      setSelection({ type: 'entity', entity: firstScript })
      return
    }
    const firstFile = contents.files.find(
      (file) => !file.isDirectory && previewKind(file.path) !== 'binary'
    )
    if (firstFile && fileUrl) setSelection({ type: 'file', file: firstFile })
  }, [contents, selection, fileUrl])

  const toggleFolder = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="card flex h-[32rem] flex-col overflow-hidden lg:col-span-2 lg:h-[36rem]">
        <div className="border-b border-border p-3">
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter contents and files"
            aria-label="Filter package contents"
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-muted"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {contents.note && (
            <p className="mb-2 rounded-md bg-surface-muted p-2 text-xs text-muted">{contents.note}</p>
          )}

          {groups.length === 0 && files.length === 0 && (
            <p className="p-2 text-sm text-muted">Nothing matches that filter.</p>
          )}

          {groups.map((group) => {
            const [singular, plural] = KIND_LABELS[group.kind]
            return (
              <section key={group.kind} className="mb-3">
                <h3 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {group.count === 1 ? singular : plural} ({group.count})
                </h3>
                <ul>
                  {group.entities.map((entity, index) => (
                    <EntityRow
                      key={entity.id}
                      entity={entity}
                      depth={0}
                      selection={selection}
                      onSelect={setSelection}
                      expanded={expanded}
                      toggleFolder={toggleFolder}
                      forceOpen={needle.length > 0}
                    />
                  ))}
                </ul>
              </section>
            )
          })}

          {files.length > 0 && (
            <section>
              <h3 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Files ({files.length})
              </h3>
              <ul>
                {fileTree.map((node) => (
                  <FileRow
                    key={node.path}
                    node={node}
                    depth={0}
                    selection={selection}
                    onSelect={setSelection}
                    expanded={expanded}
                    toggleFolder={toggleFolder}
                    selectable={Boolean(fileUrl)}
                    forceOpen={needle.length > 0}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>

        <p className="border-t border-border px-3 py-2 text-xs text-muted">
          {formatBytes(contents.totalUncompressedSize)} unpacked
        </p>
      </div>

      <div className="card h-[32rem] overflow-hidden lg:col-span-3 lg:h-[36rem]">
        {selection?.type === 'entity' ? (
          <EntityViewer
            entity={selection.entity}
            scriptUrl={
              slug
                ? `/api/packages/${slug}/script?id=${encodeURIComponent(selection.entity.id)}`
                : undefined
            }
          />
        ) : selection?.type === 'file' && fileUrl ? (
          <FileViewer file={selection.file} url={fileUrl(selection.file.path)} />
        ) : (
          <p className="p-6 text-sm text-muted">
            Select a script or file on the left to preview it here.
          </p>
        )}
      </div>
    </div>
  )
}
