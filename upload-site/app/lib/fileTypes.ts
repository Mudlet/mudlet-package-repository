export type PreviewKind = 'image' | 'text' | 'binary'

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
  if (TEXT_LANGUAGES[extension]) return 'text'
  return 'binary'
}

export function languageForFile(path: string): string {
  return TEXT_LANGUAGES[fileExtension(path)] ?? 'plaintext'
}

export function contentTypeForFile(path: string): string {
  const extension = fileExtension(path)
  if (IMAGE_TYPES[extension]) return IMAGE_TYPES[extension]
  if (TEXT_LANGUAGES[extension]) return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}
