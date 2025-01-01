import { useState } from 'react'
import { PackagePreview } from './PackagePreview'
import type { PackageMetadata } from '@/app/lib/packageParser'
import type { ValidationResult } from '@/app/lib/types'

export function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<{
    metadata: PackageMetadata;
    filename: string;
    validation: ValidationResult;
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)

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
          validation: data.validation
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview package')
      setSelectedFile(null)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    
    const input = document.getElementById('fileInput') as HTMLInputElement
    if (input) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input.files = dataTransfer.files
      handleFileSelect({ target: input } as any)
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
      setPrUrl(data.pr.html_url)
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
          <p>✓ Package received! {prUrl && (
            <a href={prUrl} rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
              Track your submission →
            </a>
          )}</p>
        </div>      
      ) : !previewData ? (
        <div 
          className="border-2 border-dashed rounded-lg p-8 text-center"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
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
            Click to select or drag and drop package file here
          </label>
        </div>
      ) : (
        <PackagePreview
          metadata={previewData.metadata}
          filename={previewData.filename}
          validation={previewData.validation}
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
