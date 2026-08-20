'use client'

import { UploadForm } from '../components/UploadForm'

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-3xl py-10">
      <h1 className="text-3xl font-bold tracking-tight">Upload a package</h1>
      <p className="mt-2 text-muted">
        Your package is checked here, then submitted as a pull request to the package repository.
        Once it passes review it appears on this site and in <code className="code-chip">mpkg</code>.
      </p>

      <div className="mt-8">
        <UploadForm />
      </div>
    </main>
  )
}
