import type { ProvenanceRecord } from '@/app/lib/provenance'
import { formatDate } from '@/app/lib/urls'

/**
 * Provenance for a package whose current archive was published from CI.
 *
 * What makes this worth showing: for most packages all anyone can see is that
 * somebody uploaded a file. Here the archive was submitted by a GitHub Actions
 * run in a named repository, proven by a token GitHub signed for that run - and
 * the record is pinned to the digest of these exact bytes, so it is checked
 * against the file being offered rather than taken on trust. Replace the file
 * by any other route and this panel stops appearing.
 *
 * The panel therefore states only what was verified. What the record proves is
 * that these bytes were submitted by that run, not that the run compiled them:
 * a release asset can be attached to a release by hand, and only a run on a tag
 * is pinned to the release it publishes. So the wording is "published from",
 * and the commit is named as the one the run was on.
 */
export function TrustedPublisherPanel({ record }: { record: ProvenanceRecord }) {
  const repoUrl = `https://github.com/${record.repository}`
  const workflowUrl = `${repoUrl}/blob/${record.commit}/${record.workflow}`
  const workflowName = record.workflow.split('/').pop() ?? record.workflow
  const published = formatDate(record.publishedAt)

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface-muted p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0 fill-success">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm3.78 5.97a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L4.22 9.03a.75.75 0 1 1 1.06-1.06L7 9.69l3.72-3.72a.75.75 0 0 1 1.06 0Z" />
        </svg>
        Published from source by CI
      </h2>

      <p className="mt-2 text-sm text-muted">
        This exact file was submitted by a GitHub Actions run in the repository below,
        which proves where it came from. It is not a file anyone uploaded by hand.
      </p>

      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-muted">Repository</dt>
          <dd className="mt-0.5">
            <a
              href={repoUrl}
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              {record.repository}
            </a>
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-muted">Workflow</dt>
          <dd className="mt-0.5">
            <a
              href={workflowUrl}
              className="font-mono text-[0.8125rem] font-medium text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {workflowName}
            </a>
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-muted">Published from</dt>
          <dd className="mt-0.5">
            <a
              href={`${repoUrl}/commit/${record.commit}`}
              className="font-mono text-[0.8125rem] font-medium text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {record.commit.slice(0, 7)}
            </a>
          </dd>
        </div>

        {published && (
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted">Published</dt>
            <dd className="mt-0.5 font-medium">{published}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
