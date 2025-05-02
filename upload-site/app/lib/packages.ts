import { UploadedPackageMetadata } from './types'

export async function fetchRepositoryPackages(): Promise<UploadedPackageMetadata[]> {
  const response = await fetch('https://raw.githubusercontent.com/Mudlet/mudlet-package-repository/refs/heads/main/packages/mpkg.packages.json')
  const data = await response.json()
  return data.packages
}
