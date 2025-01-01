import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import * as AdmZip from 'adm-zip'
import { parseConfigLua } from '@/app/lib/packageParser'

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
    return NextResponse.json({ error: 'Missing config.lua' }, { status: 400 })
  }

  const configContent = configEntry.getData().toString('utf8')
  const metadata = parseConfigLua(configContent)
  
  if (!metadata) {
    return NextResponse.json({ error: 'Invalid or incomplete config.lua' }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    metadata,
    filename: file.name
  })
}
