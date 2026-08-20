export type PreviewKind = 'image' | 'audio' | 'text' | 'binary'

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
}

/**
 * Sound packs are common - 117 .wav and 7 .mp3 files across the repository as
 * it stands - and a package that plays sounds is one you want to hear before
 * installing. Only formats a browser can actually decode are listed; anything
 * else stays a download, and the player falls back to one anyway when the
 * decode fails (old MUD packs carry ADPCM .wav files that Chrome turns down).
 */
const AUDIO_TYPES: Record<string, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
}

/** Extension -> highlight.js language id. Anything unlisted renders unhighlighted. */
const TEXT_LANGUAGES: Record<string, string> = {
  lua: 'lua',
  json: 'json',
  xml: 'xml',
  html: 'xml',
  htm: 'xml',
  md: 'markdown',
  markdown: 'markdown',
  css: 'css',
  js: 'javascript',
  mjs: 'javascript',
  ts: 'typescript',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  txt: 'plaintext',
  cfg: 'plaintext',
  ini: 'plaintext',
  conf: 'plaintext',
  csv: 'plaintext',
  log: 'plaintext',
}

export const fileExtension = (path: string) =>
  (path.split('.').pop() || '').toLowerCase()

export function previewKind(path: string): PreviewKind {
  const extension = fileExtension(path)
  if (IMAGE_TYPES[extension]) return 'image'
  if (AUDIO_TYPES[extension]) return 'audio'
  if (TEXT_LANGUAGES[extension]) return 'text'
  return 'binary'
}

export function languageForFile(path: string): string {
  return TEXT_LANGUAGES[fileExtension(path)] ?? 'plaintext'
}

export function contentTypeForFile(path: string): string {
  const extension = fileExtension(path)
  if (IMAGE_TYPES[extension]) return IMAGE_TYPES[extension]
  if (AUDIO_TYPES[extension]) return AUDIO_TYPES[extension]
  if (TEXT_LANGUAGES[extension]) return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}
