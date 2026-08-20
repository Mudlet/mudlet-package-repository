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


/** The kinds of item a Mudlet package XML can define. */
export enum PackageEntityKind {
  trigger = 'trigger',
  alias = 'alias',
  script = 'script',
  timer = 'timer',
  key = 'key',
  button = 'button',
}

/**
 * One item from the package XML - a trigger, alias, script and so on.
 * Folders nest, so this is a tree: a folder carries `children` and no script.
 */
/** One labelled field of an item, e.g. a trigger pattern or a handled event. */
export interface PackageEntityFact {
  label: string;
  value: string;
  /** Patterns and events read as code; prose labels like a button position do not. */
  mono?: boolean;
}

export interface PackageEntity {
  /** Stable path through the tree ("alias/0/2"), used to fetch the script. */
  id: string;
  kind: PackageEntityKind;
  name: string;
  isActive: boolean;
  isFolder: boolean;
  /** Pattern, key combination, timer interval ... whatever identifies the item. */
  detail: string | null;
  /** The fields worth showing for this kind of item: patterns, events, timing. */
  facts: PackageEntityFact[];
  /** Game command the item sends, for items that send one instead of running Lua. */
  command: string | null;
  hasScript: boolean;
  /**
   * Lua source, present only when the contents were parsed with inlineScripts
   * (the upload preview). Package pages fetch scripts on demand instead, so a
   * large package is not shipped to the browser in full.
   */
  script: string | null;
  scriptTruncated: boolean;
  children: PackageEntity[];
}

export interface PackageFileEntry {
  path: string;
  size: number;
  isDirectory: boolean;
}

/** What we can tell a visitor about the inside of an .mpackage. */
export interface PackageContents {
  files: PackageFileEntry[];
  entities: PackageEntity[];
  counts: Record<PackageEntityKind, number>;
  xmlPath: string | null;
  totalUncompressedSize: number;
  /** Set when the archive was too large or the XML could not be parsed. */
  note: string | null;
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