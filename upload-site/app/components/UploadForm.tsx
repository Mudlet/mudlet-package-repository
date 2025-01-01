import { useState } from 'react'
import { PackagePreview } from './PackagePreview'
import type { PackageMetadata } from '@/app/lib/packageParser'

export function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<{
    metadata: PackageMetadata;
    filename: string;
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setSelectedFile(file)
      const formData = new FormData()
      formData.append('package', file)

      const response = await fetch('/api/preview', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview package')
      }

      if (data.success) {
        setPreviewData({
          metadata: data.metadata,
          filename: data.filename,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview package')
      setSelectedFile(null)
    }
  }

  const handleConfirmUpload = async () => {
    if (!selectedFile) return
    setError(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('package', selectedFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload package')
      }

      setUploadSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload package')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {uploadSuccess ? (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          Package uploaded successfully! Your pull request has been created.
        </div>
      ) : !previewData ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".mpackage,.zip"
            onChange={handleFileSelect}
            className="hidden"
            id="fileInput"
            disabled={isUploading}
          />
          <label 
            htmlFor="fileInput"
            className={`cursor-pointer text-lg hover:text-blue-600 ${isUploading ? 'opacity-50' : ''}`}
          >
            Click to select package file
          </label>
        </div>
      ) : (
        <PackagePreview
          metadata={previewData.metadata}
          filename={previewData.filename}
          onConfirm={handleConfirmUpload}
          onCancel={() => {
            setPreviewData(null)
            setSelectedFile(null)
          }}
          isUploading={isUploading}
        />
      )}
    </div>
  )
}
