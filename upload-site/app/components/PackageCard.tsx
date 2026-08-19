import Link from 'next/link'
import Image from 'next/image'
import { UploadedPackageMetadata } from '@/app/lib/types'
import { formatDate, packageHref, packageIconUrl } from '@/app/lib/urls'

interface PackageCardProps {
  pkg: UploadedPackageMetadata
  /** Marks authors with several packages in the repository. */
  authorPackageCount?: number
}

export const PackageCard = ({ pkg, authorPackageCount = 0 }: PackageCardProps) => {
  const iconUrl = packageIconUrl(pkg.icon)
  const uploaded = formatDate(pkg.uploaded)
  const isProlificAuthor = authorPackageCount >= 5 && pkg.author !== 'Mudlet Default Package'

  return (
    <Link
      href={packageHref(pkg)}
      className="card-interactive group flex h-full flex-col gap-3 p-4"
    >
      <div className="flex items-start gap-3">
        {iconUrl && (
          <Image
            src={iconUrl}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-lg object-contain"
            unoptimized
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground group-hover:text-accent">
            {pkg.mpackage}
          </h3>
          <p className="truncate text-sm text-muted">
            <span
              className={isProlificAuthor ? 'font-medium text-warning' : undefined}
              title={isProlificAuthor ? 'This author has uploaded 5+ packages' : undefined}
            >
              {pkg.author}
            </span>
            {pkg.version && <> · v{pkg.version}</>}
          </p>
        </div>
      </div>

      {pkg.title && (
        <p className="line-clamp-3 text-sm text-foreground/90">{pkg.title}</p>
      )}

      {uploaded && (
        <p className="mt-auto pt-1 text-xs text-muted">Updated {uploaded}</p>
      )}
    </Link>
  )
}
