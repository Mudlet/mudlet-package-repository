export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  fieldErrors: Record<string, string[]>;
}

export interface PackageMetadata {
  mpackage: string | null;
  title: string | null;
  version: string | null;
  created: string | null;
  author: string | null;
  description: string | null;
  icon: string | null;
  filename: string | null;
}

/**
 * Extension of PackageMetadata,
 * now exposing the 'uploaded' field within mpkg.packages.json
 * (this is in a new interface because 'uploaded' is not known within
 * regular PackageMetadata (which is also used for packages which
 * have not yet been uploaded))
 */
export interface UploadedPackageMetadata extends PackageMetadata {
  uploaded: number;
}


/**
 * Enum for the known fields in the UploadedPackageMetadata interface
 * intended to allow the uploaded packages to be sorted by those fields
 * (defining known fields via an enum allows some more robust type safety stuff
 * via avoiding accidental use of invalid fields in hardcoded values later on)
 * 
 * 'description', 'filename', and 'icon' intentionally omitted because why would anyone need to sort by those?
 * 
 * please update the values of this enum if there's a change to UploadedPackageMetadata's fields.
 */
export enum UploadedPackageSortByOptions {
  /** sort by the name of the .mpackage */
  mpackage = "mpackage",
  /** sort by package name/title/subtitle */
  title = "title",
  /** sort by package version number */
  version = "version",
  /** sort by mpackage creation timestamp  */
  created = "created",
  /** sort by author name */
  author = "author",
  /** sort by mpackage upload unix timestamp (number) */
  uploaded = "uploaded"
}