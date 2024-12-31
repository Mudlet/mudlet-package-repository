'use client'

import { signIn, signOut, useSession } from 'next-auth/react'

export const Auth = () => {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <p>Welcome, {session.user?.name}</p>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => signIn('github')}
        className="px-4 py-2 bg-gray-800 text-white rounded"
      >
        Sign in with GitHub
      </button>
      <button
        onClick={() => signIn('facebook')}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Sign in with Facebook
      </button>
      <button
        onClick={() => signIn('apple')}
        className="px-4 py-2 bg-black text-white rounded"
      >
        Sign in with Apple
      </button>
      <button
        onClick={() => signIn('azure-ad')}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Sign in with Microsoft
      </button>
    </div>
  )
}
