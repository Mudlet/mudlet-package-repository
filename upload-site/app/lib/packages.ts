import { PackageMetadata } from './types'

export async function fetchRepositoryPackages(): Promise<PackageMetadata[]> {
  const response = await fetch('https://raw.githubusercontent.com/Mudlet/mudlet-package-repository/refs/heads/main/packages/mpkg.packages.json')
  const data = await response.json()
  return data.packages
}
