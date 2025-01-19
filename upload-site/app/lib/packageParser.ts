import { PackageMetadata } from '@/app/lib/types'

export function parseConfigLua(content: string): PackageMetadata {
  // Helper function to safely extract values
  const extractValue = (pattern: string): string | null => {
    const match = content.match(new RegExp(`${pattern} *= *(?:\\[\\[)(.*?)(?:\\]\\])`, 'ms'))
    return match ? match[1].trim() : null
  }

  const extractCreatedDate = (): string | null => {
    const match = content.match(new RegExp(`created *= *(?:")(.*?)(?:")`, 'ms'))
    return match ? match[1].trim() : null
  }

  return {
    mpackage: extractValue('mpackage'),
    title: extractValue('title'),
    version: extractValue('version'),
    created: extractCreatedDate(),
    author: extractValue('author'),
    description: extractValue('description'),
    icon: extractValue('icon'),
    filename: extractValue('filename')
  }
}

// Optional helper to check if metadata has minimum required fields
export function hasRequiredFields(metadata: PackageMetadata): boolean {
  // You can define which fields are absolutely required
  return Boolean(
    metadata.mpackage &&
    metadata.title &&
    metadata.version
  )
}
