import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import type { Metadata } from 'next'
import { fetchPackageBySlug } from '@/app/lib/packages'
import { getArchiveBuffer } from '@/app/lib/packageArchive'
import { parsePackageContents } from '@/app/lib/packageContents'
import { PackageExplorer } from '@/app/components/PackageExplorer'
import { InstallCommands } from '@/app/components/InstallCommands'
import { DragToInstall } from '@/app/components/DragToInstall'
import { formatDate, packageDownloadUrl, packageIconUrl } from '@/app/lib/urls'

type PageProps = { params: Promise<{ name: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params
  const pkg = await fetchPackageBySlug(name)
  if (!pkg) return { title: 'Package not found' }

  const icon = packageIconUrl(pkg.icon)
  return {
    title: pkg.mpackage ?? 'Package',
    description: pkg.title ?? `A Mudlet package by ${pkg.author}`,
    openGraph: {
      title: `${pkg.mpackage} — Mudlet packages`,
      description: pkg.title ?? undefined,
      images: icon ? [icon] : undefined,
    },
  }
}

/**
 * Unpacking runs during the page render rather than behind a Suspense
 * boundary: streamed boundaries in this app never hydrate on a hard load, which
 * left the explorer dead until a client-side navigation.
 */
async function ContentsSection({ filename, slug }: { filename: string; slug: string }) {
  try {
    const contents = parsePackageContents(await getArchiveBuffer(filename))
    return <PackageExplorer contents={contents} slug={slug} />
  } catch {
    return (
      <div className="card p-6 text-sm text-muted">
        The package archive could not be read just now, so its contents cannot be listed.
        Downloading still works.
      </div>
    )
  }
}

export default async function PackagePage({ params }: PageProps) {
  const { name } = await params
  const pkg = await fetchPackageBySlug(name)
  if (!pkg || !pkg.filename) notFound()

  const iconUrl = packageIconUrl(pkg.icon)
  const facts = [
    pkg.version && { label: 'Version', value: pkg.version },
    pkg.author && { label: 'Author', value: pkg.author },
    formatDate(pkg.created) && { label: 'Created', value: formatDate(pkg.created) as string },
    formatDate(pkg.uploaded) && { label: 'Updated', value: formatDate(pkg.uploaded) as string },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <main className="py-8">
      <Link href="/packages" className="text-sm text-muted hover:text-foreground">
        ← All packages
      </Link>

      <header className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {iconUrl && (
            <Image
              src={iconUrl}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-xl object-contain"
              unoptimized
            />
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{pkg.mpackage}</h1>
            {pkg.title && <p className="mt-1 text-muted">{pkg.title}</p>}
          </div>
        </div>

        <a
          href={packageDownloadUrl(pkg.filename)}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Download .mpackage
        </a>
      </header>

      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4 text-sm">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs uppercase tracking-wide text-muted">{fact.label}</dt>
            <dd className="mt-0.5 font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
        <InstallCommands
          packageName={pkg.mpackage ?? ''}
          downloadUrl={packageDownloadUrl(pkg.filename)}
        />
        <DragToInstall
          packageName={pkg.mpackage ?? ''}
          downloadUrl={packageDownloadUrl(pkg.filename)}
        />
      </div>

      {pkg.description && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">Description</h2>
          <ReactMarkdown className="prose-package">
            {pkg.description}
          </ReactMarkdown>
        </section>
      )}

      <section className="mt-8">
        <ContentsSection filename={pkg.filename} slug={name} />
      </section>
    </main>
  )
}
