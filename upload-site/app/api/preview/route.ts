import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import AdmZip from 'adm-zip'
import { parseConfigLua } from '@/app/lib/packageParser'
import { ValidationResult, PackageMetadata } from '@/app/lib/types'
import { fetchRepositoryPackages } from '@/app/lib/packages'

async function validateMetadata(metadata: PackageMetadata): Promise<ValidationResult> {
  const reservedNames = [
    'all',
    'mudlet', 
    'mpkg',
    'echo',
    'run-lua-code',
    'generic_mapper',
    'enable-accessibility',
    'deleteOldProfiles'
  ]

  const requiredFields = [
    'mpackage',
    'title',
    'version',
    'created',
    'author',
    'description'
  ]
  
  const missingFields = requiredFields.filter(field => !metadata[field as keyof PackageMetadata])
  const fieldErrors: Record<string, string[]> = {}

  if (metadata.mpackage) {
    // Check for reserved names - case insensitive and trimmed
    if (reservedNames.includes(metadata.mpackage.toLowerCase().trim())) {
      fieldErrors.mpackage = ['This package name is reserved for Mudlet system packages. Please choose a different name.']
    }

    const existingPackages = await fetchRepositoryPackages()
    const mpackageExists = existingPackages.some(pkg => 
      pkg.mpackage?.toLowerCase() === metadata.mpackage?.toLowerCase() &&
      pkg.mpackage !== metadata.mpackage
    )

    if (mpackageExists) {
      fieldErrors.mpackage = ['A package with the same name but different capitalisation already exists']
    }
  }
  
  const result = {
    isValid: missingFields.length === 0 && Object.keys(fieldErrors).length === 0,
    missingFields,
    fieldErrors
  }
  return result
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
