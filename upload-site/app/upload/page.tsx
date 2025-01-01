'use client'

import { UploadForm } from '../components/UploadForm'

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Upload Package</h1>
        <p className="mt-2 text-gray-600">
          Upload your Mudlet package to contribute to the repository. 
          Your package will be reviewed and added via pull request.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg">
        <UploadForm />
      </div>
    </div>
  )
}
