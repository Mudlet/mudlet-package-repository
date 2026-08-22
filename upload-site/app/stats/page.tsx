import { loadApiUsage } from '../lib/apiUsageReport'
import { formatBytes, formatDate } from '../lib/urls'
import { ApiUsageExplorer } from '../components/ApiUsageExplorer'

export const metadata = {
  title: 'API usage',
  description:
    'Which Mudlet Lua functions the packages in the repository actually call, and which ones nothing calls at all',
}

/**
 * Built from a file scripts/scan-api-usage.mjs writes at prebuild, so the page
 * is rendered once per deploy and never re-read at request time - a new
 * package merge redeploys the site, which is what refreshes these numbers.
 */
export const revalidate = false

const Tile = ({ value, label }: { value: string; label: string }) => (
  <div className="card p-4">
    <p className="text-2xl font-semibold tabular-nums">{value}</p>
    <p className="mt-1 text-sm text-muted">{label}</p>
  </div>
)

export default function StatsPage() {
  const report = loadApiUsage()

  if (!report) {
    return (
      <main className="py-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">API usage</h1>
        <p className="card p-6 text-sm text-muted">
          These statistics have not been generated yet. Run{' '}
          <code className="code-chip">npm run scan-api-usage</code> to build them from the packages
          in the checkout.
        </p>
      </main>
    )
  }

  const totalCalls = report.functions.reduce((sum, entry) => sum + entry.calls, 0)

  return (
    <main className="py-8">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">API usage</h1>
      <p className="mb-8 max-w-3xl text-muted">
        Every package in the repository, unpacked and read: which of Mudlet&apos;s Lua functions the
        scripts inside them call, and how widely. Useful for seeing what package authors lean on -
        and, on the other side, which parts of the API nothing in the repository has ever used.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile value={report.packagesScanned.toLocaleString('en-GB')} label="packages scanned" />
        <Tile
          value={`${report.listedFunctionsUsed} of ${report.apiFunctionCount}`}
          label="listed functions used"
        />
        <Tile value={totalCalls.toLocaleString('en-GB')} label="API calls counted" />
        <Tile value={formatBytes(report.luaBytes)} label="of Lua read" />
      </div>

      <ApiUsageExplorer
        functions={report.functions}
        unused={report.unused}
        beyond={report.beyond}
        packages={report.packages}
      />

      <section className="mt-10 max-w-3xl text-sm text-muted">
        <h2 className="mb-2 text-base font-semibold text-foreground">How this is counted</h2>
        <p className="mb-2">
          Both the scripts stored in each package&apos;s XML and any <code className="code-chip">
            .lua
          </code>{' '}
          files it ships are read, with comments and the insides of strings stripped out first, so a
          function named in a comment or echoed as text is not counted as a call. Names a package
          defines itself are left out of its own totals - a package with its own{' '}
          <code className="code-chip">display()</code> is not calling Mudlet&apos;s. That is a
          deliberately cautious rule, so these numbers undercount rather than overcount.
        </p>
        <p className="mb-2">
          What counts as the Mudlet API comes from{' '}
          <a
            href="https://github.com/Mudlet/Mudlet/blob/development/src/lua-function-list.json"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:text-accent-hover"
          >
            Mudlet&apos;s own function list
          </a>
          , the one its editor autocompletes from, fetched fresh whenever this site is built. That
          list covers global functions only, so the manual&apos;s own per-function anchors fill in
          the rest - <code className="code-chip">Geyser.Label</code>,{' '}
          <code className="code-chip">table.save</code>, <code className="code-chip">io.exists</code>{' '}
          - and supply the link behind every name here. Lua&apos;s own library is left out either
          way: <code className="code-chip">table.insert</code> is Lua&apos;s, while{' '}
          <code className="code-chip">print</code>, which Mudlet replaces, is Mudlet&apos;s.
        </p>
        <p>
          Generated {formatDate(report.generatedAt)} from {formatBytes(report.luaFileBytes)} of
          shipped <code className="code-chip">.lua</code> files and the rest from package XML.
        </p>
      </section>
    </main>
  )
}
