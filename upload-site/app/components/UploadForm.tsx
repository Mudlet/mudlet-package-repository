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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    const formData = new FormData()
    formData.append('package', file)

    const response = await fetch('/api/preview', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()

    if (data.success) {
      setPreviewData({
        metadata: data.metadata,
        filename: data.filename,
      })
    }
  }

  const handleConfirmUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)

    const formData = new FormData()
    formData.append('package', selectedFile)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()
    setIsUploading(false)
    // Handle success/error
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {!previewData ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".mpackage,.zip"
            onChange={handleFileSelect}
            className="hidden"
            id="fileInput"
          />
          <label 
            htmlFor="fileInput"
            className="cursor-pointer text-lg hover:text-blue-600"
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
        />
      )}
    </div>
  )
}
