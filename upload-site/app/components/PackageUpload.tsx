'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface UploadStatus {
  success: boolean
  pr?: {
    html_url: string
    number: number
  }
  error?: string
}

export const PackageUpload = () => {
  const { data: session } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<UploadStatus | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !session) return

    setUploading(true)
    setStatus(null)
    const formData = new FormData()
    formData.append('package', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (response.ok) {
        setStatus({ success: true, pr: data.pr })
        setFile(null)
      } else {
        setStatus({ success: false, error: data.error })
      }
    } catch (error) {
      setStatus({ success: false, error: 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 text-lg">Please sign in to upload packages</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Select .mpackage file:
          </label>
          <input 
            type="file"
            accept=".mpackage, .zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
        </div>
        <button 
          type="submit"
          disabled={!file || uploading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:bg-gray-400 disabled:cursor-not-allowed
            transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload Package'}
        </button>
      </form>

      {status && (
        <div className={`p-4 rounded-md ${status.success ? 'bg-green-50' : 'bg-red-50'}`}>
          {status.success ? (
            <div>
              <p className="text-green-700">Package uploaded successfully!</p>
              {status.pr && (
                <a
                  href={status.pr.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 underline"
                >
                  View Pull Request #{status.pr.number}
                </a>
              )}
            </div>
          ) : (
            <p className="text-red-700">{status.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
