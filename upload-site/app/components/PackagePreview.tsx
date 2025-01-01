import { type PackageMetadata } from '@/app/lib/packageParser'

interface PackagePreviewProps {
  metadata: PackageMetadata
  filename: string
  onConfirm: () => void
  onCancel: () => void
}

export function PackagePreview({ metadata, filename, onConfirm, onCancel }: PackagePreviewProps) {
  return (
    <div className="border rounded-lg p-6 bg-background">
      <h2 className="text-2xl font-bold mb-4">Package Preview</h2>
      
      <div className="space-y-4">
        <div>
          <label className="font-semibold">File:</label>
          <p>{filename}</p>
        </div>
        
        <div>
          <label className="font-semibold">Package Name:</label>
          <p>{metadata.mpackage}</p>
        </div>

        <div>
          <label className="font-semibold">Title:</label>
          <p>{metadata.title}</p>
        </div>

        <div>
          <label className="font-semibold">Version:</label>
          <p>{metadata.version}</p>
        </div>

        <div>
          <label className="font-semibold">Author:</label>
          <p>{metadata.author}</p>
        </div>

        <div>
          <label className="font-semibold">Created:</label>
          <p>{metadata.created}</p>
        </div>

        <div>
          <label className="font-semibold">Description:</label>
          <p>{metadata.description}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button 
          onClick={onConfirm}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Confirm Upload
        </button>
        <button 
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
