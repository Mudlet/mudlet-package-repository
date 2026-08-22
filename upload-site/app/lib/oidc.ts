import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

/**
 * Verification of the OIDC ID tokens GitHub Actions mints for a workflow run.
 *
 * A workflow that asks for one gets a short-lived JWT, signed by GitHub, whose
 * claims say which repository, which workflow file and which commit it was
 * issued to. That is enough to let a workflow publish a package without anyone
 * having to store a long-lived credential: the token IS the proof of identity,
 * it cannot be replayed anywhere else (the audience is pinned to us) and it
 * expires within minutes.
 *
 * Nothing here decides whether a verified run is *allowed* to publish - that is
 * trustedPublishers.ts, working from the claims this returns.
 */

export const ISSUER = 'https://token.actions.githubusercontent.com'

/**
 * The `aud` we require. A token minted for some other service cannot be
 * forwarded to us, and a token minted for us is useless anywhere else, so a
 * workflow asking for this audience is stating who it is talking to.
 */
export const PUBLISH_AUDIENCE = 'https://packages.mudlet.org'

/**
 * jose caches the fetched keys and re-fetches on an unknown `kid`, with a
 * cooldown so a bad token cannot turn into a fetch loop against GitHub.
 */
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`), {
  cacheMaxAge: 10 * 60 * 1000,
  cooldownDuration: 30 * 1000,
  timeoutDuration: 5000,
})

/**
 * The subset of the GitHub Actions claim set this service reads. GitHub sends
 * every one of these as a string, ids included.
 */
export interface ActionsClaims extends JWTPayload {
  /** "owner/repo" at the time of the run - display only, see repository_id. */
  repository: string
  /** Numeric, immutable. This, not the name, is what identifies a repository. */
  repository_id: string
  repository_owner: string
  /** Numeric, immutable. Survives an account rename. */
  repository_owner_id: string
  /**
   * "owner/repo/.github/workflows/publish.yml@refs/heads/main" - the workflow
   * file that actually contains the running job. Unlike workflow_ref this is
   * not forgeable by calling a reusable workflow, so it is what we pin to.
   */
  job_workflow_ref: string
  /** The entry-point workflow, which may differ from job_workflow_ref. */
  workflow_ref: string
  /** "refs/heads/main", "refs/tags/v1.2.3", ... */
  ref: string
  sha: string
  event_name: string
  /** Present only when the job declared an environment. */
  environment?: string
  /** "github-hosted" or "self-hosted". */
  runner_environment: string
  run_id: string
  run_attempt: string
}

const REQUIRED_CLAIMS = [
  'repository',
  'repository_id',
  'repository_owner',
  'repository_owner_id',
  'job_workflow_ref',
  'ref',
  'sha',
  'event_name',
  'runner_environment',
  'run_id',
] as const

export class TokenError extends Error {}

/**
 * Verifies signature, issuer, audience and expiry, and returns the claims.
 * Throws TokenError with a message safe to hand back to the caller.
 */
export async function verifyActionsToken(token: string): Promise<ActionsClaims> {
  let payload: JWTPayload
  try {
    const result = await jwtVerify(token, jwks, {
      issuer: ISSUER,
      audience: PUBLISH_AUDIENCE,
      // The tokens are minted for this request; allow only a little clock drift.
      clockTolerance: 30,
      maxTokenAge: '15 minutes',
    })
    payload = result.payload
  } catch (error) {
    throw new TokenError(
      `OIDC token rejected: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  }

  for (const claim of REQUIRED_CLAIMS) {
    if (typeof payload[claim] !== 'string' || !payload[claim]) {
      throw new TokenError(`OIDC token is missing the '${claim}' claim`)
    }
  }

  return payload as ActionsClaims
}

/** Reads the bearer token out of an Authorization header. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(\S+)$/i)
  return match ? match[1] : null
}

/**
 * Best-effort replay guard. Serverless instances do not share memory, so this
 * cannot be the only thing standing between us and a replayed token - it is not
 * load-bearing, and the real protections are the short expiry and the pinned
 * audience. Replaying a token within its lifetime opens a duplicate pull
 * request, which a maintainer closes; it cannot land anything on its own.
 */
const seenTokens = new Map<string, number>()

export function rememberToken(claims: ActionsClaims): boolean {
  const id = typeof claims.jti === 'string' ? claims.jti : null
  if (!id) return true

  const now = Date.now()
  for (const [key, expiry] of seenTokens) {
    if (expiry <= now) seenTokens.delete(key)
  }

  if (seenTokens.has(id)) return false
  seenTokens.set(id, (claims.exp ?? Math.floor(now / 1000) + 900) * 1000)
  return true
}
