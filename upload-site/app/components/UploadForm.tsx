'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { upload } from '@vercel/blob/client'
import { PackagePreview } from './PackagePreview'
import { PackageMetadata } from '@/app/lib/types'
import type { PackageContents, ValidationResult } from '@/app/lib/types'

export function UploadForm() {
  const { data: session } = useSession()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<{
    metadata: PackageMetadata;
    filename: string;
    validation: ValidationResult;
    contents: PackageContents | null;
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
          contents: data.contents ?? null,
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
      <div className="card p-10 text-center">
        <p className="font-medium">Sign in to upload a package</p>
        <p className="mt-1 text-sm text-muted">
          Uploads open a pull request against the package repository, so we need to know who you are.
        </p>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {uploadSuccess ? (
        <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-success">
          ✓ Package received!{' '}
          {prUrl && (
            <a href={prUrl} rel="noopener noreferrer" className="underline">
              Track your submission →
            </a>
          )}
        </div>
      ) : !previewData ? (
        <>
          <div
            className="card border-2 border-dashed p-10 text-center"
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
              className={`cursor-pointer font-medium text-accent hover:text-accent-hover ${isUploading ? 'opacity-50' : ''}`}
            >
              Choose a .mpackage file
            </label>
            <p className="mt-1 text-sm text-muted">or drag and drop it here</p>
          </div>
          {isLoading && <p className="mt-4 text-center text-sm text-muted">Reading package…</p>}
        </>
      ) : (
        <PackagePreview
          metadata={previewData.metadata}
          filename={previewData.filename}
          validation={previewData.validation}
          contents={previewData.contents}
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
