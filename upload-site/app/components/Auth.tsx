'use client'

import { signIn, signOut, useSession } from 'next-auth/react'

export const Auth = () => {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="flex items-center gap-4 py-4">
        <span className="text-gray-700">Welcome</span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3 py-4 px-6">
      <button
        onClick={() => signIn()}
        className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors"
      >
        Sign in
      </button>
    </div>
  )
}
