interface PackageMetadata {
  mpackage: string;
  title: string;
  version: string;
  created: string;
  author: string;
  description: string;
}

export function parseConfigLua(content: string): PackageMetadata | null {
  const fields = {
    mpackage: content.match(/mpackage\s*=\s*["'](.+?)["']/),
    title: content.match(/title\s*=\s*["'](.+?)["']/),
    version: content.match(/version\s*=\s*["'](.+?)["']/),
    created: content.match(/created\s*=\s*["'](.+?)["']/),
    author: content.match(/author\s*=\s*["'](.+?)["']/),
    description: content.match(/description\s*=\s*["'](.+?)["']/)
  }

  // Verify all required fields are present
  if (Object.values(fields).some(match => !match)) {
    return null;
  }

  return {
    mpackage: fields.mpackage![1],
    title: fields.title![1],
    version: fields.version![1],
    created: fields.created![1],
    author: fields.author![1],
    description: fields.description![1]
  }
}
