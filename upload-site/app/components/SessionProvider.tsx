'use client'

import { SessionProvider as Provider } from "next-auth/react"

/**
 * Client boundary for next-auth. The session is deliberately *not* handed down
 * from the server: reading it in the root layout made every route in the app
 * dynamic, package pages included. It is fetched here instead, which only the
 * header's sign-in control waits on - see Auth.
 */
export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Provider>
      {children}
    </Provider>
  )
}
