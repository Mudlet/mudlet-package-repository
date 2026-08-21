import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { PackageContents as Contents, PackageMetadata, ValidationResult } from '@/app/lib/types'
import { PackageExplorer } from './PackageExplorer'

interface PackagePreviewProps {
  metadata: PackageMetadata
  filename: string
  contents: Contents | null
  onConfirm: () => void
  onCancel: () => void
  isUploading: boolean
  validation: ValidationResult
}

const FIELDS: { key: keyof PackageMetadata; label: string }[] = [
  { key: 'mpackage', label: 'Name' },
  { key: 'title', label: 'Title' },
  { key: 'version', label: 'Version' },
  { key: 'author', label: 'Author' },
  { key: 'created', label: 'Created' },
]

export function PackagePreview({
  metadata,
  filename,
  contents,
  onConfirm,
  onCancel,
  isUploading,
  validation,
}: PackagePreviewProps) {
  const fieldIssue = (field: string) =>
    validation.missingFields.includes(field) || Boolean(validation.fieldErrors[field])

  const Status = ({ field }: { field: string }) =>
    fieldIssue(field) ? (
      <span className="text-danger" aria-label="invalid">
        ✗
      </span>
    ) : (
      <span className="text-success" aria-label="valid">
        ✓
      </span>
    )

  const errorMessages = [
    validation.missingFields.length
      ? `Missing required fields: ${validation.missingFields.join(', ')}`
      : null,
    ...Object.values(validation.fieldErrors).map((errors) => errors.join(', ')),
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Package preview</h2>
            <p className="mt-1 break-all text-sm text-muted">{filename}</p>
          </div>
          {metadata.icon && (
            <Image
              src={metadata.icon}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-xl object-contain"
              unoptimized
            />
          )}
        </div>

        <dl className="mt-6 space-y-3">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-3 text-sm">
              <dt className="flex items-center gap-1.5 font-medium text-muted">
                {label} <Status field={key} />
              </dt>
              <dd className="break-words">
                {metadata[key] || <span className="text-danger">required</span>}
              </dd>
            </div>
          ))}

          <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-3 text-sm">
            <dt className="flex items-center gap-1.5 font-medium text-muted">
              Description <Status field="description" />
            </dt>
            <dd>
              {metadata.description ? (
                <ReactMarkdown className="prose-package">
                  {metadata.description}
                </ReactMarkdown>
              ) : (
                <span className="text-danger">required</span>
              )}
            </dd>
          </div>
        </dl>

        {errorMessages.length > 0 && (
          <ul className="mt-6 space-y-1 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {errorMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onConfirm}
            disabled={isUploading || !validation.isValid}
            title={errorMessages.join(' ') || 'Confirm upload'}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isUploading ? 'Uploading…' : 'Confirm upload'}
          </button>

          <button
            onClick={onCancel}
            disabled={isUploading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {contents && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            What this package installs
          </h3>
          <PackageExplorer contents={contents} />
        </div>
      )}
    </div>
  )
}
