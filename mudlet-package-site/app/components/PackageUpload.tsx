'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export const PackageUpload = () => {
  const { data: session } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !session) return

    setUploading(true)
    const formData = new FormData()
    formData.append('package', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        // Handle successful upload
        setFile(null)
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  if (!session) {
    return <p>Please sign in to upload packages</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-2">Select .mpackage file:</label>
        <input 
          type="file"
          accept=".mpackage"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border p-2"
        />
      </div>
      <button 
        type="submit"
        disabled={!file || uploading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {uploading ? 'Uploading...' : 'Upload Package'}
      </button>
    </form>
  )
}
