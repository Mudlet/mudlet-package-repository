import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import AdmZip from 'adm-zip'
import { parseConfigLua } from '@/app/lib/packageParser'
import { ValidationResult, PackageMetadata } from '@/app/lib/types'
import { fetchRepositoryPackages } from '@/app/lib/packages'

async function validateMetadata(metadata: PackageMetadata): Promise<ValidationResult> {
  console.log('metadata:', metadata)
  const requiredFields = [
    'mpackage',
    'title',
    'version',
    'created',
    'author',
    'description'
  ]
  console.log('requiredFields:', requiredFields)
  
  const missingFields = requiredFields.filter(field => !metadata[field as keyof PackageMetadata])
  console.log('missingFields:', missingFields)
  const fieldErrors: Record<string, string[]> = {}
  console.log('fieldErrors initialized:', fieldErrors)

  if (metadata.title) {
    console.log('checking title:', metadata.title)
    const existingPackages = await fetchRepositoryPackages()
    console.log('existingPackages:', existingPackages)
    const titleExists = existingPackages.some(pkg => 
      pkg.title?.toLowerCase() === metadata.title?.toLowerCase() &&
      pkg.title !== metadata.title
    )
    console.log('titleExists:', titleExists)

    if (titleExists) {
      fieldErrors.title = ['Title already exists with different capitalization']
      console.log('fieldErrors after title check:', fieldErrors)
    }
  }
  
  const result = {
    isValid: missingFields.length === 0 && Object.keys(fieldErrors).length === 0,
    missingFields,
    fieldErrors
  }
  console.log('final result:', result)
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
