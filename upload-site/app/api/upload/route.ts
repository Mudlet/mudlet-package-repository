import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { del } from '@vercel/blob'
import { createBranch, uploadFile, createPullRequest, getFileSha, deleteFile } from '@/app/lib/github'
import AdmZip from 'adm-zip'
import { parseConfigLua } from '@/app/lib/packageParser'
import { PackageMetadata } from '@/app/lib/types'

interface PackagesJson {
  packages: PackageMetadata[];
  updated: string;
}

export async function POST(request: Request) {
  const session = await getServerSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('Getting request data...')
  const { blobUrl, filename } = await request.json()
  
  if (!blobUrl || !filename) {
    return NextResponse.json({ error: 'Missing blob URL or filename' }, { status: 400 })
  }
  
  console.log('Checking file format...')
  if (!filename.endsWith('.mpackage') && !filename.endsWith('.zip')) {
    console.log('Invalid file format detected')
    return NextResponse.json({ error: 'Invalid file format' }, { status: 400 })
  }

  // Download file from blob storage
  console.log('Downloading file from blob storage...')
  let response;
  let fileBuffer;
  
  try {
    response = await fetch(blobUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch from blob storage`)
    }
    fileBuffer = Buffer.from(await response.arrayBuffer())
  } catch (error) {
    console.error('Error downloading from blob:', error)
    return NextResponse.json({ 
      error: 'Failed to download file from storage. Please try uploading again.' 
    }, { status: 400 })
  }
  
  const zip = new AdmZip(fileBuffer)
  const configEntry = zip.getEntry('config.lua')
  
  if (!configEntry) {
    return NextResponse.json({ error: 'Missing config.lua' }, { status: 400 })
  }

  const configContent = configEntry.getData().toString('utf8')
  const metadata = parseConfigLua(configContent)

  if (!metadata) {
    return NextResponse.json({ error: 'Invalid or incomplete config.lua' }, { status: 400 })
  }

  // Read and parse existing packages
  const packagesJson = await fetch('https://raw.githubusercontent.com/Mudlet/mudlet-package-repository/refs/heads/main/packages/mpkg.packages.json')
  const packagesData = await packagesJson.json() as PackagesJson

  // Find existing package by name and author
  const existingPackage = packagesData.packages.find(pkg => 
    pkg.mpackage === metadata.mpackage && 
    pkg.author === metadata.author
  ) as PackageMetadata & { filename: string }

  console.log('Generating branch name...')
  const timestamp = new Date().toISOString().slice(0,19).replace(/[:.]/g, '-')
  const sanitizedName = filename
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .substring(0, 50)
  const branchName = `package-upload/${sanitizedName}-${timestamp}`
  console.log('Branch name:', branchName)
  console.log('Converting file to base64...')
  const fileContent = fileBuffer.toString('base64')
  console.log('File content length:', fileContent.length)
  
  try {
    console.log('Creating new branch from main...')
    await createBranch(branchName, 'main')
    console.log('Branch created successfully')
    
    // If found, delete the old package version
    if (existingPackage) {
      const oldFilePath = `packages/${existingPackage.filename}`
      const oldFileSha = await getFileSha(oldFilePath)
      
      if (oldFileSha) {
        console.log('Deleting old version of package...')
        await deleteFile(
          oldFilePath,
          `Delete old version: ${existingPackage.filename}`,
          oldFileSha,
          branchName
        )
        console.log('Old version deleted successfully')
      }
    }

    console.log('Uploading package file...', { fileName: filename, branchName, contentLength: fileContent.length })

    await uploadFile(
      `packages/${filename}`,
      fileContent,
      branchName,
      existingPackage ? `Update package: ${filename}` : `Add package: ${filename}`,
    )
    
    console.log('File uploaded successfully')
    
    const prDescription = `Package information:
- Name: ${metadata.mpackage}
- Title: ${metadata.title}
- Version: ${metadata.version}
- Author: ${metadata.author}
- Created: ${metadata.created}

---
${metadata.description}`

    console.log('Creating PR...')
    const pr = await createPullRequest(
      branchName,
      existingPackage ? `Update package: ${filename}` : `Add package: ${filename}`,
      prDescription
    )    

    console.log('Upload successful, cleaning up blob...')
    try {
      await del(blobUrl)
      console.log('Blob cleanup successful')
    } catch (cleanupError) {
      console.warn('Failed to cleanup blob:', cleanupError)
      // Don't fail the entire operation for cleanup errors
    }
    
    console.log('Returning success response...')
    return NextResponse.json({ success: true, pr: pr.data })
  } catch (error) {
    console.error('GitHub API error:', error)
    
    // Attempt cleanup on failure
    try {
      await del(blobUrl)
      console.log('Blob cleanup after error successful')
    } catch (cleanupError) {
      console.warn('Failed to cleanup blob after error:', cleanupError)
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create PR' 
    }, { status: 500 })
  }
}
