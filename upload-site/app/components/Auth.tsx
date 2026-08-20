'use client'

import { signIn, signOut, useSession } from 'next-auth/react'

const buttonClass =
  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60'

export const Auth = () => {
  const { data: session, status } = useSession()

  // The session is fetched by the browser rather than rendered in (see
  // SessionProvider), so hold the control's space until it lands instead of
  // showing a signed-out button to someone who is signed in.
  if (status === 'loading') {
    return <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-muted" aria-hidden="true" />
  }

  if (session) {
    const name = session.user?.name || session.user?.email

    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[12rem] truncate text-sm text-muted md:inline" title={name ?? undefined}>
          {name}
        </span>
        <button
          onClick={() => signOut()}
          className={`${buttonClass} border border-border bg-surface-muted text-foreground hover:bg-border/60`}
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn()}
      className={`${buttonClass} bg-accent text-accent-contrast hover:bg-accent-hover`}
    >
      Sign in
    </button>
  )
}
