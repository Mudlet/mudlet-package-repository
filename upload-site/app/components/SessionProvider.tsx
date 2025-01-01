'use client'

import { SessionProvider as Provider } from "next-auth/react"
import { Session } from "next-auth"

export const SessionProvider = ({ children, session }: {
  children: React.ReactNode,
  session: Session | null
}) => {
  return (
    <Provider session={session}>
      {children}
    </Provider>
  )
}
