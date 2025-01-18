const fs = require('fs')
const path = require('path')

function getPathsFromDir(dir) {
  const paths = []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const item of items) {
    if (item.isDirectory()) {
      // Skip api, lib, components folders
      if (['api', 'lib', 'components'].includes(item.name)) continue
      // Skip folders starting with [ or ( (dynamic/group routes)
      if (item.name.startsWith('[') || item.name.startsWith('(')) continue
      
      const fullPath = path.join(dir, item.name)
      paths.push('/' + item.name)
      // Recursively get paths from subdirectories
      paths.push(...getPathsFromDir(fullPath).map(p => `/${item.name}${p}`))
    }
  }
  return paths
}

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://packages.mudlet.org',
  generateRobotsTxt: true,
  outDir: './public',
  additionalPaths: async (config) => {
    const appDir = path.join(process.cwd(), 'app')
    const paths = ['/', ...getPathsFromDir(appDir)]
    
    return paths.map(path => ({
      loc: path,
      lastmod: new Date().toISOString()
    }))
  }
}
