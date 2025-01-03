export interface ValidationResult {
  isValid: boolean
  missingFields: string[]
  validationErrors: string[]
}

export interface PackageMetadata {
  mpackage: string | null;
  title: string | null;
  version: string | null;
  created: string | null;
  author: string | null;
  description: string | null;
}
