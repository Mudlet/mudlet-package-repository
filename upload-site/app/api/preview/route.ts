import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import AdmZip from 'adm-zip'
import { parseConfigLua } from '@/app/lib/packageParser'
import { ValidationResult, PackageMetadata } from '@/app/lib/types'
import { fetchRepositoryPackages } from '@/app/lib/packages'
import { parsePackageContents } from '@/app/lib/packageContents'
import { MAX_METADATA_BYTES, readEntryWithin } from '@/app/lib/packageArchive'

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

  const { blobUrl, filename } = await request.json()
  
  if (!blobUrl) {
    return NextResponse.json({ error: 'No blob URL provided' }, { status: 400 })
  }
  
  if (filename?.endsWith('.xml')) {
    return NextResponse.json({ 
      error: 'XML files need to be packaged as .mpackage first. Use the Package Manager in Mudlet to create a package.'
    }, { status: 400 })
  }

  if (!filename?.endsWith('.mpackage') && !filename?.endsWith('.zip')) {
    return NextResponse.json({ 
      error: 'File must be a valid Mudlet .mpackage (or .zip)'
    }, { status: 400 })
  }

  // Download file from blob storage
  const response = await fetch(blobUrl)
  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 400 })
  }
  
  const fileBuffer = Buffer.from(await response.arrayBuffer())
  
  const zip = new AdmZip(fileBuffer)
  
  const configEntry = zip.getEntry('config.lua')
  if (!configEntry) {
    return NextResponse.json({ error: 'Missing config.lua. Is this a valid Mudlet package?' }, { status: 400 })
  }

  const config = readEntryWithin(configEntry, MAX_METADATA_BYTES)
  if (!config) {
    return NextResponse.json({ error: 'config.lua is too large to be a Mudlet package config' }, { status: 400 })
  }

  const configContent = config.toString('utf8')
  const metadata = parseConfigLua(configContent)
  
  if (!metadata) {
    return NextResponse.json({ error: 'Invalid or incomplete config.lua' }, { status: 400 })
  }

  // Extract icon if specified in metadata
  if (metadata.icon) {
    const iconEntry = zip.getEntry(`.mudlet/Icon/${metadata.icon}`)
    // An icon over the budget is dropped rather than inlined - it is going into
    // a data: URI, so an oversized one is not worth expanding either.
    const iconData = readEntryWithin(iconEntry, MAX_METADATA_BYTES)
    if (iconData) {
      const extension = metadata.icon.match(/\.[^.]+$/)?.[0] || '.png'
      metadata.icon = `data:image/${extension.slice(1)};base64,${iconData.toString('base64')}`
    } else {
      metadata.icon = null
    }
  }
  
  const validation = await validateMetadata(metadata)

  // Same archive, same parser as the public package pages, so an uploader sees
  // exactly what visitors will see before the pull request is opened.
  let contents = null
  try {
    contents = parsePackageContents(fileBuffer, { inlineScripts: true })
  } catch {
    // A contents listing is a bonus; never block an upload over it.
  }

  return NextResponse.json({
    success: true,
    metadata,
    filename,
    validation,
    contents,
    blobUrl
  })
}
