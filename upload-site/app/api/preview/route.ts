import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import AdmZip from 'adm-zip'
import { parseConfigLua } from '@/app/lib/packageParser'
import { ValidationResult, PackageMetadata } from '@/app/lib/types'
import { fetchRepositoryPackages } from '@/app/lib/packages'

async function validateMetadata(metadata: PackageMetadata): Promise<ValidationResult> {
  const requiredFields = [
    'mpackage',
    'title',
    'version',
    'created',
    'author',
    'description'
  ]
  
  const missingFields = requiredFields.filter(field => !metadata[field as keyof PackageMetadata])
  const validationErrors: string[] = []

  // Case-insensitive package name validation
  if (metadata.mpackage) {
    const existingPackages = await fetchRepositoryPackages()
    const packageExists = existingPackages.some(pkg => 
      pkg.mpackage?.toLowerCase() === metadata.mpackage?.toLowerCase() &&
      pkg.mpackage !== metadata.mpackage
    )

    if (packageExists) {
      validationErrors.push(`Package name already exists with different capitalization`)
    }
  }
  
  return {
    isValid: missingFields.length === 0 && validationErrors.length === 0,
    missingFields,
    validationErrors
  }
}

export async function POST(request: Request) {
  const session = await getServerSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('package') as File
  
  if (!file || (!file.name.endsWith('.mpackage') && !file.name.endsWith('.zip'))) {
    return NextResponse.json({ error: 'Invalid file format' }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const zip = new AdmZip(fileBuffer)
  
  const configEntry = zip.getEntry('config.lua')
  if (!configEntry) {
    return NextResponse.json({ error: 'Missing config.lua. Is this a valid Mudlet package?' }, { status: 400 })
  }

  const configContent = configEntry.getData().toString('utf8')
  const metadata = parseConfigLua(configContent)
  
  if (!metadata) {
    return NextResponse.json({ error: 'Invalid or incomplete config.lua' }, { status: 400 })
  }

  const validation = await validateMetadata(metadata)

  return NextResponse.json({
    success: true,
    metadata,
    filename: file.name,
    validation
  })
}
