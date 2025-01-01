import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createBranch, uploadFile, createPullRequest, getFileSha } from '@/app/lib/github'

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

  console.log('Generating branch name...')
  const branchName = `package-upload/${file.name}-${new Date().toISOString().slice(0,19).replace(/[:.]/g, '-')}`
  console.log('Branch name:', branchName)
  console.log('Converting file to base64...')
  const fileContent = Buffer.from(await file.arrayBuffer()).toString('base64')
  console.log('File content length:', fileContent.length)
  
  try {
    console.log('Creating new branch from main...')
    await createBranch(branchName, 'main')
    console.log('Branch created successfully')
    
    console.log('Uploading package file...', { fileName: file.name, branchName, contentLength: fileContent.length })

    const filePath = `packages/${file.name}`
    const existingSha = await getFileSha(filePath)
    
    await uploadFile(
      filePath,
      fileContent,
      branchName,
      existingSha ? `Update package: ${file.name}` : `Add package: ${file.name}`,
      existingSha ?? undefined
    )
    
    console.log('File uploaded successfully')
    
    console.log('Creating PR...')
    const pr = await createPullRequest(
      branchName,
      existingSha ? `Update package: ${file.name}` : `Add package: ${file.name}`,
      `${existingSha ? 'Updated' : 'Added'} by ${session.user?.name || 'unknown user'}`
    )    

    console.log('Returning success response...')
    return NextResponse.json({ success: true, pr: pr.data })
  } catch (error) {
    console.error('GitHub API error:', error)
    return NextResponse.json({ error: 'Failed to create PR' }, { status: 500 })
  }
}
