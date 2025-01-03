import { PackageMetadata } from './types'

export async function fetchRepositoryPackages(): Promise<PackageMetadata[]> {
  const response = await fetch('https://mudlet.github.io/mudlet-package-repository/packages/mpkg.packages.json')
  const data = await response.json()
  return data.packages
}
