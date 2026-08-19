import { NextResponse } from 'next/server'
import { fetchPackageBySlug } from '@/app/lib/packages'
import { getArchiveBuffer } from '@/app/lib/packageArchive'
import { extractEntityScript } from '@/app/lib/packageContents'

/**
 * Serves the Lua of one trigger/alias/script/... out of a published package.
 * Scripts are fetched per item rather than shipped with the page, because the
 * larger packages hold megabytes of Lua across hundreds of items.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const id = new URL(request.url).searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'No item id given' }, { status: 400 })
  }

  const pkg = await fetchPackageBySlug(slug)
  if (!pkg?.filename) {
    return NextResponse.json({ error: 'Unknown package' }, { status: 404 })
  }

  let result
  try {
    result = extractEntityScript(await getArchiveBuffer(pkg.filename), id)
  } catch {
    return NextResponse.json({ error: 'Could not read the package' }, { status: 502 })
  }

  if (!result) {
    return NextResponse.json({ error: 'No script for that item' }, { status: 404 })
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
