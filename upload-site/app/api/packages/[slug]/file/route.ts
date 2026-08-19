import { NextResponse } from 'next/server'
import { fetchPackageBySlug } from '@/app/lib/packages'
import { readPackageEntry } from '@/app/lib/packageArchive'
import { contentTypeForFile } from '@/app/lib/fileTypes'

/** Anything bigger than this is a download, not a preview. */
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024

/**
 * Serves one file out of a published package so the package page can preview
 * it. Only files that are already public in the repository are reachable: the
 * slug must resolve to an indexed package, and the path must name an entry
 * inside that package's archive.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const path = new URL(request.url).searchParams.get('path')

  if (!path) {
    return NextResponse.json({ error: 'No path given' }, { status: 400 })
  }

  const pkg = await fetchPackageBySlug(slug)
  if (!pkg?.filename) {
    return NextResponse.json({ error: 'Unknown package' }, { status: 404 })
  }

  let entry
  try {
    // The cap goes in rather than being applied to the result, so an oversized
    // entry is never decompressed just to be rejected afterwards.
    entry = await readPackageEntry(pkg.filename, path, MAX_PREVIEW_BYTES)
  } catch {
    return NextResponse.json({ error: 'Could not read the package' }, { status: 502 })
  }

  if (!entry) {
    return NextResponse.json({ error: 'No such file in this package' }, { status: 404 })
  }

  if (!entry.data) {
    return NextResponse.json({ error: 'File is too large to preview' }, { status: 413 })
  }

  return new NextResponse(new Uint8Array(entry.data), {
    headers: {
      'Content-Type': contentTypeForFile(path),
      'Content-Length': String(entry.data.length),
      // Package contents change only when a new version is published, and the
      // page linking here is itself revalidated daily.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      // Package files are third-party content: keep anything active (SVG in
      // particular) from running with this origin's privileges.
      'Content-Security-Policy': "sandbox; default-src 'none'",
    },
  })
}
