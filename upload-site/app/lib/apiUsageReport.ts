import { readFileSync } from 'fs'
import path from 'path'
import { ApiUsageReport } from './apiUsage'

const generatedPath = path.join(process.cwd(), 'app', 'lib', 'generated', 'api-usage.json')

/**
 * The report scripts/scan-api-usage.mjs writes at prebuild, or null when it has
 * not run - `next dev` without its predev, say. The stats page renders once at
 * build time (see its `revalidate`), so this read never happens at request time
 * and the generated file does not need to reach the deployment.
 *
 * Kept apart from apiUsage.ts because the explorer component is a client one
 * and imports the types from there; a bare `fs` import in that file follows it
 * into the browser bundle, where it does not resolve.
 */
export function loadApiUsage(): ApiUsageReport | null {
  try {
    return JSON.parse(readFileSync(generatedPath, 'utf8')) as ApiUsageReport
  } catch {
    return null
  }
}
