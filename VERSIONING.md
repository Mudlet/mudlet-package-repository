# Dependency Versioning in mpkg

This document describes the dependency version constraint system introduced in
this PR and proposes the structural changes needed to support installing specific
(older) package versions in a future PR.

---

## 1. What changed in this PR

### The bug that was there before

The `dependencies` field in `config.lua` was never written to
`mpkg.packages.json` by `reindex.lua`.  As a result, `mpkg.getDependencies()`
always returned an empty table and dependency checking did nothing at all — it
was truly advisory in practice, not just by design.

This PR fixes `reindex.lua` to include the `dependencies` field and rewrites the
dependency system to actually enforce it.

### New dependency DSL

Package authors can now express version requirements on their dependencies.

#### Array form (recommended for any versioned constraint)

Set `dependencies` to a Lua table (array) in `config.lua`.  Each element is a
spec string:

```lua
-- Any version of Muxlet
dependencies = {"Muxlet"}

-- Muxlet 1.2.0 or newer
dependencies = {"Muxlet:>=1.2.0"}

-- Muxlet at least 1.0.0 but strictly below 2.0.0
dependencies = {"Muxlet:>=1.0.0,<2.0.0"}

-- Always use the very latest release of Muxlet
dependencies = {"Muxlet:latest"}

-- Multiple dependencies
dependencies = {
  "Muxlet:>=1.2.0",
  "generic_mapper",
}
```

#### Legacy string form (still supported, no version constraints)

Packages that do not need version constraints can keep the old format:

```lua
dependencies = "Muxlet"
dependencies = "Muxlet,generic_mapper"
```

The legacy format is **not** extended to support version operators because the
commas that separate packages would be ambiguous with the commas that separate
multiple operators within a single constraint (e.g. `>=1.0.0,<2.0.0`).

#### Supported operators

| Operator | Meaning                   |
|----------|---------------------------|
| `>=`     | greater-than-or-equal     |
| `>`      | strictly greater-than     |
| `<=`     | less-than-or-equal        |
| `<`      | strictly less-than        |
| `==`     | exactly equal             |
| `!=`     | not equal                 |
| `latest` | special keyword — always upgrade to the latest available version |

Versions must be valid semantic version strings (e.g. `1.2.0`, `2.0.0-beta.1`).

### Automatic dependency resolution

`mpkg install <package>` and `mpkg upgrade <package>` now automatically resolve
dependencies before acting on the main package:

| Dep state                                | Action                                  |
|------------------------------------------|-----------------------------------------|
| Not installed                            | Install latest from repository          |
| Installed, version satisfies constraints | Skip (no action)                        |
| Installed, version too old               | Upgrade to latest (if latest satisfies) |
| Installed, version too new (max exceeded)| Error — see limitation below            |

Installation is sequential and event-driven: each package's `sysInstallPackage`
event triggers the next item in the queue, so downloads don't race each other.

### Current limitation: max-version constraints and downgrading

If the currently installed version of a dependency exceeds a `<` or `<=`
constraint, mpkg cannot satisfy it because the repository only stores **one
version per package** (the latest).  In this situation mpkg reports an error and
aborts.

Solving this requires the structural changes described in Section 2.

---

## 2. Proposed structural changes for multi-version storage

> **Status:** Proposal only — not implemented in this PR.  Requires a separate
> discussion and PR from the repository maintainers.

### Problem

The current repository stores exactly one `.mpackage` file per package.
When a new version is uploaded it silently replaces the previous one.  There is
no way to install or pin an older version, and therefore no way to enforce an
upper-bound (`<` / `<=`) version constraint in practice.

### Proposed solution: version-stamped filenames + version history

#### 2a. Filename convention

Adopt a `<PackageName>-<version>.mpackage` filename convention for all new
uploads.  Example:

```
packages/
  Muxlet-1.0.0.mpackage      ← kept indefinitely
  Muxlet-1.2.0.mpackage      ← newest release
  fed2-tools-2.1.0.mpackage
```

Existing packages with non-versioned filenames continue to work until their next
release, at which point the new release uses the versioned filename.

A migration script can rename existing files in bulk if the maintainers choose
a hard cut-over instead of a gradual transition.

#### 2b. Index format — per-package version list

`mpkg.packages.json` gains a `versions` array alongside the existing flat fields
(which keep pointing to the latest release for backward compatibility):

```json
{
  "packages": [
    {
      "mpackage":       "Muxlet",
      "author":         "...",
      "title":          "...",
      "description":    "...",
      "version":        "1.2.0",
      "filename":       "Muxlet-1.2.0.mpackage",
      "latest_version": "1.2.0",
      "versions": [
        {
          "version":  "1.2.0",
          "filename": "Muxlet-1.2.0.mpackage",
          "created":  "2025-06-01T00:00:00Z"
        },
        {
          "version":  "1.0.0",
          "filename": "Muxlet-1.0.0.mpackage",
          "created":  "2024-01-15T00:00:00Z"
        }
      ]
    }
  ]
}
```

#### 2c. mpkg CLI additions

New commands and behaviour:

```
mpkg versions <package>            -- list all available versions
mpkg install <package>@<version>   -- install a specific version
```

`buildInstallQueue` would use the `versions` array to find the highest version
that satisfies all constraints rather than always defaulting to `latest`.

#### 2d. CI/CD changes required

| File | Change needed |
|------|---------------|
| `validate-mpackage.yml` | Relax "one file per PR" rule, or allow multiple files when they are versions of the same package |
| `validate-mpackage.yml` | Enforce version-in-filename convention for new uploads |
| `create-package-index.yml` | Run updated `reindex.lua` that groups files by `mpackage` name into `versions` arrays |
| `reindex.lua` | Group multiple files for the same package; track `latest_version` |

#### 2e. Storage and retention policy

The maintainers will need to decide:

- **Keep all versions forever** — simplest, but the `packages/` directory grows
  unboundedly.
- **Keep the N most recent versions** — `reindex.lua` could prune files older
  than version N automatically on each push.
- **Author-controlled retention** — package authors tag which old versions to
  keep when submitting a new one.

A reasonable starting point is keeping the two most recent versions (current +
one prior), which is sufficient for the typical use-case of pinning to a
known-good release while a new major version stabilises.

---

## 3. Interaction between the two PRs

This PR's dependency DSL is forward-compatible with the multi-version storage
proposal.  Once version history is available:

- `mpkg.buildInstallQueue` selects the **highest version satisfying all
  constraints** rather than always using latest.
- Upper-bound constraints (`<2.0.0`) become fully enforceable.
- `mpkg install pkg@1.0.0` can be used to install a specific version for testing
  or rollback.

Until then, upper-bound constraints produce a clear error message rather than
silently ignoring the constraint.
