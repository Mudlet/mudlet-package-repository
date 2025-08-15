'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { upload } from '@vercel/blob/client'
import { PackagePreview } from './PackagePreview'
import { PackageMetadata } from '@/app/lib/types'
import type { ValidationResult } from '@/app/lib/types'

export function UploadForm() {
  const { data: session } = useSession()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<{
    metadata: PackageMetadata;
    filename: string;
    validation: ValidationResult;
    blobUrl: string;
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewRequested, setPreviewRequested] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (previewRequested && !previewData) {
      timeout = setTimeout(() => setIsLoading(true), 250)
    }
    return () => clearTimeout(timeout)
  }, [previewRequested, previewData])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setSelectedFile(file)
      setPreviewRequested(true)
      
      // Upload file to blob storage first
      let blob;
      try {
        blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/blob/upload',
        })
      } catch (uploadError) {
        throw new Error(uploadError instanceof Error ? uploadError.message : 'Failed to upload file to storage')
      }

      // Now call preview with blob URL
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: blob.url,
          filename: file.name
        }),
      })
      
      if (!response.ok) {
        let errorMessage = 'Failed to preview package'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error (${response.status})`
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()

      if (data.success) {
        setPreviewData({
          metadata: data.metadata,
          filename: data.filename,
          validation: data.validation,
          blobUrl: blob.url
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview package')
      setSelectedFile(null)
    } finally {
      setPreviewRequested(false)
      setIsLoading(false)
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
      handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>)
    }
  }

  const handleConfirmUpload = async () => {
    if (!previewData || !session) return
    setError(null)
    setIsUploading(true)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: previewData.blobUrl,
          filename: previewData.filename
        }),
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

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">Please sign in to upload packages</p>
        </div>
      </div>
    )
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
        <>
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
          {isLoading && (
            <div className="text-gray-600 text-center mt-4">
              Loading preview...
            </div>
          )}
        </>
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
