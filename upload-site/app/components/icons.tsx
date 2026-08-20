import { PackageEntityKind } from '@/app/lib/types'
import { fileExtension, previewKind } from '@/app/lib/fileTypes'

/**
 * A small line-icon set for package contents, drawn in the same stroke style as
 * the rest of the site. Mudlet's editor colour-codes its item types; these are
 * our own glyphs following that idea so a long tree stays scannable.
 */
const Svg = ({ className, children }: { className: string; children: React.ReactNode }) => (
  <svg
    className={`h-4 w-4 shrink-0 ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const KIND_ICONS: Record<PackageEntityKind, { color: string; paths: React.ReactNode }> = {
  // Fires on matched text: a bolt.
  [PackageEntityKind.trigger]: {
    color: 'text-icon-trigger',
    paths: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  },
  // A command you type: a prompt.
  [PackageEntityKind.alias]: {
    color: 'text-icon-alias',
    paths: (
      <>
        <rect x="2.5" y="4" width="19" height="16" rx="2" />
        <path d="m7 10 2.5 2L7 14M12.5 15h4" />
      </>
    ),
  },
  // Lua that runs on its own: braces.
  [PackageEntityKind.script]: {
    color: 'text-icon-script',
    paths: (
      <path d="M8.5 4c-2 0-2.5 1.2-2.5 3v2c0 1.7-.8 3-2 3 1.2 0 2 1.3 2 3v2c0 1.8.5 3 2.5 3M15.5 4c2 0 2.5 1.2 2.5 3v2c0 1.7.8 3 2 3-1.2 0-2 1.3-2 3v2c0 1.8-.5 3-2.5 3" />
    ),
  },
  [PackageEntityKind.timer]: {
    color: 'text-icon-timer',
    paths: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M9 2h6" />
      </>
    ),
  },
  [PackageEntityKind.key]: {
    color: 'text-icon-key',
    paths: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M7 9h.01M11 9h.01M15 9h2M8 14h8" />
      </>
    ),
  },
  [PackageEntityKind.button]: {
    color: 'text-icon-button',
    paths: (
      <>
        <rect x="2.5" y="5.5" width="13" height="9" rx="2" />
        <path d="m13 13 8 3-3.2 1.3L16.3 21 13 13z" />
      </>
    ),
  },
}

export const EntityIcon = ({ kind }: { kind: PackageEntityKind }) => {
  const icon = KIND_ICONS[kind]
  return <Svg className={icon.color}>{icon.paths}</Svg>
}

export const FolderIcon = ({ open }: { open: boolean }) => (
  <Svg className="text-icon-folder">
    {open ? (
      <path d="M3 8.5V19a1 1 0 0 0 1 1h15.5a1 1 0 0 0 .95-.68l2-6A1 1 0 0 0 21.5 12H7.2a1 1 0 0 0-.95.68L4 19.5M3 8.5V5.5a1 1 0 0 1 1-1h5l2 2.5h7a1 1 0 0 1 1 1V12" />
    ) : (
      <path d="M3 6.5a1 1 0 0 1 1-1h5l2 2.5h9a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    )}
  </Svg>
)

const IMAGE_ICON = (
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m4 17 4.5-4.5 3 3L15 12l5 5" />
  </>
)

const AUDIO_ICON = (
  <>
    <path d="M11 5 6.5 9H3v6h3.5L11 19z" />
    <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.8 6.5a7.5 7.5 0 0 1 0 11" />
  </>
)

const CODE_ICON = (
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="m10.5 12-1.5 2 1.5 2M13.5 12l1.5 2-1.5 2" />
  </>
)

const TEXT_ICON = (
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M8.5 13h7M8.5 17h4" />
  </>
)

const BINARY_ICON = (
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </>
)

export const FileIcon = ({ path }: { path: string }) => {
  const kind = previewKind(path)

  if (kind === 'image') return <Svg className="text-icon-image">{IMAGE_ICON}</Svg>
  if (kind === 'audio') return <Svg className="text-icon-audio">{AUDIO_ICON}</Svg>
  if (kind === 'binary') return <Svg className="text-icon-file">{BINARY_ICON}</Svg>

  const extension = fileExtension(path)
  const isCode = ['lua', 'js', 'mjs', 'ts', 'css', 'json', 'xml', 'html', 'htm', 'yml', 'yaml', 'sh'].includes(extension)
  return (
    <Svg className={isCode ? 'text-icon-script' : 'text-icon-file'}>
      {isCode ? CODE_ICON : TEXT_ICON}
    </Svg>
  )
}
