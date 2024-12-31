import { PackageUpload } from '../components/PackageUpload'

export default function UploadPage() {
  return (
    <div className="page-content">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Upload Package</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <PackageUpload />
      </div>
    </div>
  )
}
