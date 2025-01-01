import { type PackageMetadata } from '@/app/lib/packageParser'

interface PackagePreviewProps {
  metadata: PackageMetadata
  filename: string
  onConfirm: () => void
  onCancel: () => void
  isUploading: boolean
}

export function PackagePreview({ 
  metadata, 
  filename, 
  onConfirm, 
  onCancel, 
  isUploading 
}: PackagePreviewProps) {
  return (
    <div className="border rounded-lg p-6 bg-background">
      <h2 className="text-2xl font-bold mb-4">Package Preview</h2>
      
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-[120px,1fr] gap-2">
          <label className="font-semibold">File:</label>
          <p className="break-all">{filename}</p>
        </div>
        
        <div className="grid grid-cols-[120px,1fr] gap-2">
          <label className="font-semibold">Package Name:</label>
          <p className="break-all">{metadata.mpackage}</p>
        </div>

        <div className="grid grid-cols-[120px,1fr] gap-2">
          <label className="font-semibold">Title:</label>
          <p className="break-all">{metadata.title}</p>
        </div>

        <div className="grid grid-cols-[120px,1fr] gap-2">
          <label className="font-semibold">Version:</label>
          <p>{metadata.version}</p>
        </div>

        <div className="grid grid-cols-[120px,1fr] gap-2">
          <label className="font-semibold">Author:</label>
          <p>{metadata.author}</p>
        </div>

        <div className="grid grid-cols-[120px,1fr] gap-2">
          <label className="font-semibold">Created:</label>
          <p>{metadata.created}</p>
        </div>

        <div className="grid grid-cols-[120px,1fr] gap-2">
          <label className="font-semibold">Description:</label>
          <p className="whitespace-pre-wrap break-words">{metadata.description}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={onConfirm}
          disabled={isUploading}
          className={`
            px-4 py-2 rounded text-white
            ${isUploading 
              ? 'bg-green-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
            }
            flex items-center gap-2
          `}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                  fill="none"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading...
            </>
          ) : (
            'Confirm Upload'
          )}
        </button>
        
        <button 
          onClick={onCancel}
          disabled={isUploading}
          className={`
            px-4 py-2 rounded text-white
            ${isUploading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gray-600 hover:bg-gray-700'
            }
          `}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
