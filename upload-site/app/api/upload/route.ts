import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
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

  console.log('Getting form data...')
  const formData = await request.formData()
  console.log('Getting package file from form data...')
  const file = formData.get('package') as File
  console.log('File:', file)
  console.log('Checking file format...')
  if (!file || (!file.name.endsWith('.mpackage') && !file.name.endsWith('.zip'))) {
    console.log('Invalid file format detected')
    return NextResponse.json({ error: 'Invalid file format' }, { status: 400 })
  }

  // Extract metadata from package
  const fileBuffer = Buffer.from(await file.arrayBuffer())
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
  const sanitizedName = file.name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .substring(0, 50)
  const branchName = `package-upload/${sanitizedName}-${timestamp}`
  console.log('Branch name:', branchName)
  console.log('Converting file to base64...')
  const fileContent = Buffer.from(await file.arrayBuffer()).toString('base64')
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

    console.log('Uploading package file...', { fileName: file.name, branchName, contentLength: fileContent.length })

    await uploadFile(
      `packages/${file.name}`,
      fileContent,
      branchName,
      existingPackage ? `Update package: ${file.name}` : `Add package: ${file.name}`,
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
      existingPackage ? `Update package: ${file.name}` : `Add package: ${file.name}`,
      prDescription
    )    

    console.log('Returning success response...')
    return NextResponse.json({ success: true, pr: pr.data })
  } catch (error) {
    console.error('GitHub API error:', error)
    return NextResponse.json({ error: 'Failed to create PR' }, { status: 500 })
  }
}
