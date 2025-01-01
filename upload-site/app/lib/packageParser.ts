export interface PackageMetadata {
  mpackage: string | null;
  title: string | null;
  version: string | null;
  created: string | null;
  author: string | null;
  description: string | null;
}

export function parseConfigLua(content: string): PackageMetadata {
  // Helper function to safely extract values
  const extractValue = (pattern: string): string | null => {
    const match = content.match(new RegExp(`${pattern}\\s*=\\s*["'](.+?)["']`))
    return match ? match[1] : null
  }

  return {
    mpackage: extractValue('mpackage'),
    title: extractValue('title'),
    version: extractValue('version'),
    created: extractValue('created'),
    author: extractValue('author'),
    description: extractValue('description')
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
