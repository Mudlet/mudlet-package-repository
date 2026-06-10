--- Command line package manager for Mudlet.

mpkg = mpkg or {}
mpkg.aliases = mpkg.aliases or {}
mpkg.maintainer = "https://github.com/mudlet/mudlet-package-repository/issues"
mpkg.repository = "https://github.com/Mudlet/mudlet-package-repository/raw/refs/heads/main/packages"
mpkg.website = "http://packages.mudlet.org"
mpkg.websiteUploads = f"{mpkg.website}/upload"
mpkg.filename = "mpkg.packages.json"
-- alow updates to these non-versioned packages
mpkg.whitelist = { "echo", "generic_mapper", "run-lua-code",
                   "enable-accessibility", "deleteOldProfiles",
                   "gui-drop", "StressinatorDisplayBench", "run-tests" }


--- Entry point of script.
function mpkg.initialise()

  -- clean up any old info
  mpkg.uninstallSelf()

  registerNamedEventHandler("mpkg", "download", "sysDownloadDone", "mpkg.eventHandler")
  registerNamedEventHandler("mpkg", "download-error", "sysDownloadError", "mpkg.eventHandler")
  registerNamedEventHandler("mpkg", "installed", "sysInstallPackage", "mpkg.eventHandler")
  registerNamedEventHandler("mpkg", "uninstalled", "sysUninstallPackage", "mpkg.eventHandler")

  mpkg.aliases = mpkg.aliases or {}

  table.insert(mpkg.aliases, tempAlias("^mpkg( help)?$", mpkg.displayHelp))
  table.insert(mpkg.aliases, tempAlias("^mpkg install(?: (.+))?$", function() mpkg.install(matches[2]) end))
  table.insert(mpkg.aliases, tempAlias("^mpkg list$", mpkg.listInstalledPackages))
  table.insert(mpkg.aliases, tempAlias("^mpkg remove(?: (.+))?$", function() mpkg.remove(matches[2]) end))
  table.insert(mpkg.aliases, tempAlias("^mpkg show(?: (.+))?$", function() mpkg.show(matches[2]) end))
  table.insert(mpkg.aliases, tempAlias("^mpkg search(?: (.+))?$", function() mpkg.search(matches[2]) end))
  table.insert(mpkg.aliases, tempAlias("^mpkg update$", function() mpkg.updatePackageList(false) end))

  -- Setup a named timer for automatic repository listing updates every 12 hours (60s*60m*12h=43200s)
  registerNamedTimer("mpkg", "mpkg update package listing timer", 43200, function() mpkg.updatePackageList(true) end, true)

  --mpkg.reloadPackageListFromFile()
  mpkg.updatePackageList(true)
end


--- Check if mpkg is ready for use.
-- External factors, e.g., no internet connection can cause
-- mpkg to fail.  We'll call this in functions where failure
-- is likely.
function mpkg.ready(silent)

  if mpkg.packages and mpkg.packages['packages'] then return true end

  if not silent then
    mpkg.echo("Aborting, unable to read repository information.  Retrying package listing update.")
    mpkg.updatePackageList(false)
  else
    mpkg.updatePackageList(true)
  end

  return false

end


--- Pretty print any script echoes so users know where the information came from.
-- @param args the string to echo to the main console
function mpkg.echo(args)
  cecho(string.format("%s  - %s\n", "<khaki>[ MPKG ]<reset>", args))
end

--- Pretty print any text, followed by a clickable link.
-- Requires end of line terminator.
-- @param args a string to echo preceding the clickable link
-- @param ... a set of args as per cechoLink format
function mpkg.echoLink(args, ...)
  cecho(string.format("%s  - %s", "<khaki>[ MPKG ]<reset>", args))
  cechoLink(...)
end


--- Load the local package list if available.
function mpkg.reloadPackageListFromFile()

    local filename = getMudletHomeDir() .. "/" .. mpkg.filename

    local file, error, content = io.open(filename)

    if not error then
      content = file:read("*a")
      mpkg.packages = json_to_value(content)
      io.close(file)
      mpkg.checkForUpgrades(true)
    end

end


--- Get which version of a package is installed on in Mudlet.
-- If package does not have a version, nil is returned.  This
-- package would be considered a local usermade package that
-- will not be eligible for mpkg updates.
-- If package does not have a version and is in the whitelist
-- return 0 to allow updates (typically mudlet default packages).
-- @param args the package name as found in getPackageInfo()
-- @return nil and error message if not found
-- @return string containing a version if found
function mpkg.getInstalledVersion(args)
  local installedVersion = getPackageInfo(args, "version")

  if installedVersion ~= "" then
    return installedVersion
  end

  if table.contains(mpkg.whitelist, args) then
    return 0
  else
    return nil, "No version found."
  end
end


--- Get which version of a package is available in the repository.
-- @param args the package name as listed in the repository
-- @return nil and error message if not found
-- @return string containing a version if found
function mpkg.getRepositoryVersion(args)

  if not mpkg.ready() then return end

  local packages = mpkg.packages["packages"]

  for i = 1, #packages do
    if args == packages[i]["mpackage"] then
      return packages[i]["version"]
    end
  end

  return nil, "Package does not exist in repository."
end


--- Get a table of dependency package names for a package.
-- Returns only the package names, discarding any version constraints.
-- Prefer mpkg.getDependencySpecs() for new code; this function is kept
-- for backward compatibility with external scripts.
-- @param args the package name as listed in the repository
-- @return nil and error message if not found
-- @return an empty table (no deps) or table of package name strings
function mpkg.getDependencies(args)

  if not mpkg.ready() then return end

  local packages = mpkg.packages["packages"]

  for i = 1, #packages do
    if args == packages[i]["mpackage"] then
      local raw = packages[i]["dependencies"]
      if not raw or raw == "" then return {} end

      -- New array format: extract the package name before any ':' constraint
      if type(raw) == "table" then
        local names = {}
        for _, spec in ipairs(raw) do
          local name = tostring(spec):match("^([^:]+)")
          if name then
            table.insert(names, name:match("^%s*(.-)%s*$"))
          end
        end
        return names
      end

      -- Legacy comma-separated string
      return string.split(raw, ",")
    end
  end

  return nil, "Package does not exist in repository."
end


--- Find a single package entry in the repository index by name.
-- @param packageName the package name (case-insensitive)
-- @return table with the package's repository data, or nil if not found
function mpkg.findRepositoryEntry(packageName)
  if not mpkg.ready() then return nil end
  local packages = mpkg.packages["packages"]
  for i = 1, #packages do
    if string.lower(packages[i]["mpackage"]) == string.lower(packageName) then
      return packages[i]
    end
  end
  return nil
end


--- Parse a single dependency specification string into a structured table.
-- Supports these formats (version operators: >= > <= < == !=):
--   "PackageName"                  -- any installed version is acceptable
--   "PackageName:latest"           -- always upgrade to the latest version
--   "PackageName:>=1.0.0"          -- minimum version
--   "PackageName:<=2.0.0"          -- maximum version (inclusive)
--   "PackageName:>=1.0.0,<2.0.0"  -- version range
-- Note: use the array form of the dependencies field in config.lua so that
-- commas inside a single spec are not confused with package separators.
-- @param spec a single dependency specification string
-- @return table {name, constraints, wantLatest}
function mpkg.parseDependencySpec(spec)
  spec = (spec or ""):match("^%s*(.-)%s*$")

  local colonPos = spec:find(":", 1, true)
  if not colonPos then
    return {name = spec, constraints = {}, wantLatest = false}
  end

  local name          = spec:sub(1, colonPos - 1):match("^%s*(.-)%s*$")
  local constraintStr = spec:sub(colonPos + 1):match("^%s*(.-)%s*$")

  if constraintStr == "latest" then
    return {name = name, constraints = {}, wantLatest = true}
  end

  local constraints = {}
  for part in constraintStr:gmatch("[^,]+") do
    part = part:match("^%s*(.-)%s*$")
    local op, ver = part:match("^([><=!~]+)%s*(.+)$")
    if op and ver then
      table.insert(constraints, {op = op, version = ver:match("^%s*(.-)%s*$")})
    end
  end

  return {name = name, constraints = constraints, wantLatest = false}
end


--- Check whether a version string satisfies all given version constraints.
-- @param installedVersion string version to test
-- @param constraints table array of {op, version} tables
-- @return true if all constraints pass
-- @return false and the first failing constraint table if any constraint fails
function mpkg.satisfiesConstraints(installedVersion, constraints)
  if not constraints or #constraints == 0 then return true end

  local ok, installed = pcall(semver, tostring(installedVersion))
  if not ok then return false, {op = "?", version = tostring(installedVersion)} end

  for _, c in ipairs(constraints) do
    local ok2, required = pcall(semver, c.version)
    if not ok2 then return false, c end

    local satisfied
    if     c.op == ">="             then satisfied = installed >= required
    elseif c.op == ">"              then satisfied = installed >  required
    elseif c.op == "<="             then satisfied = installed <= required
    elseif c.op == "<"              then satisfied = installed <  required
    elseif c.op == "==" or c.op == "="  then satisfied = installed == required
    elseif c.op == "!=" or c.op == "~=" then satisfied = installed ~= required
    else satisfied = false
    end

    if not satisfied then return false, c end
  end

  return true
end


--- Safely parse a version value into a semver object.
-- Wraps the semver() call in pcall so that malformed or missing versions
-- (e.g. the integer 0 returned for whitelisted packages) do not crash the
-- caller.  Returns nil on parse failure rather than propagating the error.
-- @param v version string, number, or nil
-- @return semver object, or nil if v is absent or cannot be parsed
function mpkg.parseVersion(v)
  if v == nil then return nil end
  local ok, sv = pcall(semver, tostring(v))
  return ok and sv or nil
end


--- Format a parsed dependency spec as a human-readable constraint string.
-- @param spec parsed spec table from mpkg.parseDependencySpec
-- @return string such as "(>=1.0.0, <2.0.0)", "(any version)", or "(latest)"
function mpkg.formatDependencyConstraint(spec)
  if spec.wantLatest then return "(latest)" end
  if not spec.constraints or #spec.constraints == 0 then return "(any version)" end
  local parts = {}
  for _, c in ipairs(spec.constraints) do
    table.insert(parts, c.op .. c.version)
  end
  return "(" .. table.concat(parts, ", ") .. ")"
end


--- Get structured dependency specs for a package from the repository index.
-- Handles both the legacy comma-separated string format and the new array format.
--   Legacy: "pkg1,pkg2"           -> each treated as an unversioned dependency
--   New:    {"pkg1:>=1.0.0","pkg2"} -> each element is a full spec string
-- @param packageName the package name as listed in the repository
-- @return table array of parsed dependency specs (may be empty)
-- @return nil and an error string if the package is not found or repo is not ready
function mpkg.getDependencySpecs(packageName)
  if not mpkg.ready() then return nil, "Repository not ready." end

  local entry = mpkg.findRepositoryEntry(packageName)
  if not entry then
    return nil, f"Package '{packageName}' not found in repository."
  end

  local raw = entry["dependencies"]
  if not raw or raw == "" then return {} end

  -- New array format: JSON array decoded into a Lua table with integer keys
  if type(raw) == "table" then
    local specs = {}
    for _, item in ipairs(raw) do
      local spec = mpkg.parseDependencySpec(tostring(item))
      if spec.name and spec.name ~= "" then
        table.insert(specs, spec)
      end
    end
    return specs
  end

  -- Legacy string format: plain comma-separated package names, no version constraints
  local specs = {}
  for part in raw:gmatch("[^,]+") do
    part = part:match("^%s*(.-)%s*$")
    if part ~= "" then
      table.insert(specs, {name = part, constraints = {}, wantLatest = false})
    end
  end
  return specs
end


--- Build a sequential install queue that satisfies a package's dependency constraints.
-- Each dependency is compared against the currently installed version and resolved to
-- one of: skip (already satisfied), install (missing), or upgrade (version too old).
-- If a max-version constraint is violated by the installed package, the build fails
-- because downgrading is not yet supported (see VERSIONING.md for the roadmap).
-- The main package entry is always appended last so dependencies install first.
-- @param repoEntry the repository index entry for the package to install or upgrade
-- @param isUpgrade if true, the main package item is flagged to uninstall before install
-- @return table array of queue items {name, filename, version, isUpgrade, reason}
-- @return nil and an error string if a dependency cannot be satisfied
function mpkg.buildInstallQueue(repoEntry, isUpgrade)
  local specs, err = mpkg.getDependencySpecs(repoEntry["mpackage"])
  if not specs then
    return nil, err or "Could not read dependency information."
  end

  local queue = {}

  for _, spec in ipairs(specs) do
    local depEntry = mpkg.findRepositoryEntry(spec.name)
    if not depEntry then
      return nil, f"Dependency '{spec.name}' is not available in the repository."
    end

    -- Find if this dep is already installed (case-insensitive match)
    local installedName = nil
    for _, pkg in pairs(getPackages()) do
      if string.lower(pkg) == string.lower(spec.name) then
        installedName = pkg
        break
      end
    end

    if not installedName then
      -- Missing: install it
      table.insert(queue, {
        name      = spec.name,
        filename  = depEntry["filename"],
        version   = depEntry["version"],
        isUpgrade = false,
        reason    = f"required dependency {mpkg.formatDependencyConstraint(spec)}"
      })
    else
      local installedVer = mpkg.getInstalledVersion(installedName) or "0"
      local repoVer      = depEntry["version"]

      if spec.wantLatest then
        local iv = mpkg.parseVersion(installedVer)
        local rv = mpkg.parseVersion(repoVer)
        if iv and rv and iv < rv then
          table.insert(queue, {
            name      = installedName,
            filename  = depEntry["filename"],
            version   = repoVer,
            isUpgrade = true,
            reason    = "latest version required"
          })
        elseif not iv then
          -- Installed version is not parseable as semver; upgrade to get a clean release
          table.insert(queue, {
            name      = installedName,
            filename  = depEntry["filename"],
            version   = repoVer,
            isUpgrade = true,
            reason    = "latest version required (installed version unreadable)"
          })
        end

      elseif #spec.constraints > 0 then
        local satisfied, failedConstraint = mpkg.satisfiesConstraints(installedVer, spec.constraints)

        if not satisfied then
          -- >= / > : too old.  != / ~= : excluded version.  Both can be fixed by upgrading.
          if failedConstraint and (
              failedConstraint.op == ">=" or failedConstraint.op == ">" or
              failedConstraint.op == "!=" or failedConstraint.op == "~="
             ) then
            local iv = mpkg.parseVersion(installedVer)
            local rv = mpkg.parseVersion(repoVer)
            if iv and rv and iv < rv then
              local repoSatisfied = mpkg.satisfiesConstraints(repoVer, spec.constraints)
              if repoSatisfied then
                table.insert(queue, {
                  name      = installedName,
                  filename  = depEntry["filename"],
                  version   = repoVer,
                  isUpgrade = true,
                  reason    = f"upgrade required {mpkg.formatDependencyConstraint(spec)}"
                })
              else
                return nil, f"Dependency '{spec.name}': latest repository version v{repoVer} does not satisfy {mpkg.formatDependencyConstraint(spec)}."
              end
            elseif not iv then
              return nil, f"Dependency '{spec.name}': installed version could not be compared against {mpkg.formatDependencyConstraint(spec)}."
            else
              return nil, f"Dependency '{spec.name}' v{installedVer} does not satisfy {mpkg.formatDependencyConstraint(spec)} and no newer version is available in the repository."
            end
          else
            -- Installed version exceeds a maximum (< / <=) or wrong exact (==) constraint;
            -- downgrade is not supported yet — see VERSIONING.md for the roadmap.
            return nil, f"Dependency '{spec.name}' v{installedVer} does not satisfy {mpkg.formatDependencyConstraint(spec)}.  Downgrading is not currently supported (see VERSIONING.md)."
          end
        end
        -- Constraint already satisfied: no action needed for this dep
      end
      -- No constraints and not wantLatest: any installed version is fine
    end
  end

  -- Main package goes last so all deps are installed/upgraded first
  table.insert(queue, {
    name          = repoEntry["mpackage"],
    filename      = repoEntry["filename"],
    version       = repoEntry["version"],
    isUpgrade     = isUpgrade,
    isMainPackage = true
  })

  return queue
end


--- Start a sequential install queue, processing one package at a time.
-- Each install triggers the next via mpkg.eventHandler sysInstallPackage.
-- Upgrades (isUpgrade = true) uninstall first and continue via sysUninstallPackage.
-- @param items table array of queue items from mpkg.buildInstallQueue
-- @return false if a queue is already running
function mpkg.startInstallQueue(items)
  if mpkg.installQueue then
    mpkg.echo("An installation is already in progress.  Please wait and try again.")
    return false
  end
  mpkg.installQueue = {items = items, index = 1}
  mpkg.processInstallQueue()
  return true
end


--- Advance to and execute the next item in the active install queue.
-- Called initially by mpkg.startInstallQueue and subsequently by the event handler.
-- Sets q.currentlyInstalling so the event handler only reacts to the expected
-- sysInstallPackage event, ignoring installs triggered by other means.
function mpkg.processInstallQueue()
  local q = mpkg.installQueue
  if not q then return end

  if q.index > #q.items then
    mpkg.installQueue = nil
    mpkg.echo("All installations complete.")
    return
  end

  local item   = q.items[q.index]
  q.index      = q.index + 1

  if item.isUpgrade then
    -- Waiting for sysUninstallPackage before we can install
    q.pendingAfterUninstall = item
    q.currentlyInstalling   = nil
    local currentVer = mpkg.getInstalledVersion(item.name)
    mpkg.echo(f"Removing <b>{item.name}</b> v{currentVer} before upgrading to v{item.version}...")
    uninstallPackage(item.name)
  else
    -- Record which package we expect sysInstallPackage for
    q.currentlyInstalling = string.lower(item.name)
    q.currentFilename     = item.filename
    local label = item.reason and f"  [{item.reason}]" or ""
    mpkg.echo(f"Installing <b>{item.name}</b> (v{item.version}){label}...")
    installPackage(f"{mpkg.repository}/{item.filename}")
  end
end


--- Check if there are any packages that can be upgraded to a new version.
-- Checks if the installed version of a package is less than the repository
-- version using semantic versioning methods.
-- @param silent if true, do not display update messages
function mpkg.checkForUpgrades(silent)

  if not mpkg.ready(silent) then return end

  local packages = mpkg.packages["packages"]
  local requireUpgrade = {}

  for _, pkg in pairs(getPackages()) do
    local installedVersion = mpkg.getInstalledVersion(pkg)
    local repoVersion = mpkg.getRepositoryVersion(pkg)

    if repoVersion and installedVersion then
      if semver(installedVersion) < semver(repoVersion) then
        table.insert(requireUpgrade, pkg)
      end
    end
  end

  if not silent then
    if not table.is_empty(requireUpgrade) then
      mpkg.echo("New package upgrades available.  The following packages can be upgraded:")
      mpkg.echo("")
      for _, pkg in pairs(requireUpgrade) do
        mpkg.echoLink(f"<b>{pkg}</b> v{mpkg.getInstalledVersion(pkg)} to v{mpkg.getRepositoryVersion(pkg)}", " (<b>click to upgrade</b>)\n", function() mpkg.upgrade(pkg) end, "Click to upgrade", true)
      end
    else
        mpkg.echo("No package upgrades are available.")
    end
  end

end


--- Upgrade all packages at once.
-- Packages are upgraded one at a time in sequence; each upgrade starts after
-- the previous one completes so they do not conflict with each other.
-- @param silent do not show mpkg messages, system messages will continue to show
function mpkg.performUpgradeAll(silent)

  if not mpkg.ready() then return end

  local requireUpgrade = {}

  for _, pkg in pairs(getPackages()) do
    local installedVersion = mpkg.getInstalledVersion(pkg)
    local repoVersion      = mpkg.getRepositoryVersion(pkg)

    if repoVersion and installedVersion then
      if semver(installedVersion) < semver(repoVersion) then
        table.insert(requireUpgrade, pkg)
      end
    end
  end

  if table.is_empty(requireUpgrade) then
    if not silent then
      mpkg.echo("No package upgrades are available.")
    end
    return
  end

  if not silent then
    mpkg.echo("New package upgrades available.  The following packages will be upgraded:")
    mpkg.echo("")
    for _, pkg in pairs(requireUpgrade) do
      mpkg.echo(f"<b>{pkg}</b> v{mpkg.getInstalledVersion(pkg)} to v{mpkg.getRepositoryVersion(pkg)}")
    end
  end

  -- Upgrade sequentially: each call to mpkg.upgrade uses the install queue,
  -- so we wait for the queue to clear before starting the next package.
  local function upgradeNext(remaining)
    if #remaining == 0 then return end
    -- If another install is running, wait for it first
    if mpkg.installQueue then
      tempTimer(1, function() upgradeNext(remaining) end)
      return
    end
    local pkg = table.remove(remaining, 1)
    mpkg.upgrade(pkg)
    -- Poll until the current package's queue clears, then move to the next.
    -- retries caps at 120 (~2 minutes) so a stuck or failed queue cannot
    -- cause an infinite polling loop.
    local function waitForQueue(retries)
      retries = (retries or 0) + 1
      if mpkg.installQueue then
        if retries > 120 then
          mpkg.echo(f"Upgrade of <b>{pkg}</b> timed out.  Skipping remaining packages.")
          mpkg.installQueue = nil
          return
        end
        tempTimer(1, function() waitForQueue(retries) end)
      else
        upgradeNext(remaining)
      end
    end
    tempTimer(1, function() waitForQueue(0) end)
  end

  upgradeNext(requireUpgrade)

end


--- Print the help file.
function mpkg.displayHelp()

  mpkg.echo("<u>Mudlet Package Repository Client (mpkg)</u>")
  mpkg.echoLink("", f"[{mpkg.website}]\n", function() openUrl(mpkg.website) end, "open package website", true)

local help = [[

<b>mpkg</b> is a command line interface for managing packages in Mudlet.
You can install, update, remove and search the package repository.

Commands:
  mpkg install          -- install/upgrade a package
  mpkg list             -- list all installed packages
  mpkg remove           -- remove an existing package
  mpkg search           -- search for a package
  mpkg show             -- show detailed information about a package
  mpkg update           -- update package listing from repository
]]

  local help = string.split(help, "\n")

  for i = 1, #help do
    mpkg.echo(help[i])
  end

mpkg.echoLink("", "Visit https://packages.mudlet.org/upload to share your package.\n", function() mpkg.openWebUploads() end, "open browser at upload website", true)

end


--- Install a new package from the repository, resolving dependencies automatically.
-- If the package is already installed, checks for and applies any available update.
-- Missing dependencies are installed first; outdated dependencies are upgraded first.
-- @param args the package name as listed in the repository
-- @return false if there was an error or the package is already up-to-date
-- @return true if installation was initiated
function mpkg.install(args)

  if not args then
    mpkg.echo("Missing package name.")
    mpkg.echo("Syntax: mpkg install <package_name>")
    return false
  end

  if not mpkg.ready() then return end

  -- If already installed redirect to upgrade
  for _, pkg in pairs(getPackages()) do
    if string.lower(pkg) == string.lower(args) then
      mpkg.echo(f"<b>{pkg}</b> is already installed.  Checking for updates.")
      mpkg.upgrade(pkg)
      return false
    end
  end

  local repoEntry = mpkg.findRepositoryEntry(args)
  if not repoEntry then
    mpkg.echo(f"Unable to locate <b>{args}</b> package in repository.")
    return false
  end

  local queue, err = mpkg.buildInstallQueue(repoEntry, false)
  if not queue then
    mpkg.echo(f"Cannot install <b>{args}</b>: {err}")
    return false
  end

  -- Queue always ends with the main package; anything before it is a dependency action
  local depActionCount = #queue - 1

  if depActionCount == 0 then
    mpkg.echo(f"Installing <b>{repoEntry['mpackage']}</b> (v{repoEntry['version']}).")
    installPackage(f"{mpkg.repository}/{repoEntry['filename']}")
  else
    local depWord = depActionCount == 1 and "dependency" or "dependencies"
    mpkg.echo(f"Installing <b>{repoEntry['mpackage']}</b> (v{repoEntry['version']}) — resolving {depActionCount} {depWord} first.")
    mpkg.startInstallQueue(queue)
  end

  return true
end

--- Remove a locally installed package.
-- @param args the package name as listed in the repository
-- @return false if there was an error
-- @return true if packages was successfully uninstalled/removed
function mpkg.remove(args)

  if not args then
    mpkg.echo("Missing package name.")
    mpkg.echo("Syntax: mpkg remove <package_name>")
    return false
  end

  local installedPackages = getPackages()

  for _, pkg in pairs(installedPackages) do
    if string.lower(pkg) == string.lower(args) then
      uninstallPackage(pkg)
      mpkg.echo(f"<b>{pkg}</b> package removed.")
      return true
    end
  end

  mpkg.echo(f"<b>{args}</b> package is not currently installed.")
  return false

end


--- Upgrade a locally installed package to the latest repository version.
-- Also resolves any dependency changes introduced by the new version: missing
-- dependencies are installed and outdated ones are upgraded before the main package.
-- @param args the package name as listed in the repository
-- @return false if there was an error or the package is already up-to-date
-- @return true if the upgrade was initiated
function mpkg.upgrade(args)

  if not args then
    mpkg.echo("Missing package name.")
    mpkg.echo("Syntax: mpkg upgrade <package_name>")
    mpkg.echo("        mpkg upgrade all")
    return false
  end

  if not table.contains(getPackages(), args) then
    mpkg.echo(f"<b>{args}</b> package is not installed.")
    return false
  end

  if not mpkg.ready() then return false end

  local installedVersion = mpkg.getInstalledVersion(args)
  local repoVersion      = mpkg.getRepositoryVersion(args)

  if not (installedVersion and repoVersion and semver(installedVersion) < semver(repoVersion)) then
    mpkg.echo(f"<b>{args}</b> v{installedVersion} is already the latest version.")
    return false
  end

  local repoEntry = mpkg.findRepositoryEntry(args)
  if not repoEntry then
    mpkg.echo(f"<b>{args}</b> not found in repository.")
    return false
  end

  local queue, err = mpkg.buildInstallQueue(repoEntry, true)
  if not queue then
    mpkg.echo(f"Cannot upgrade <b>{args}</b>: {err}")
    return false
  end

  -- depActionCount excludes the last item (the main package itself)
  local depActionCount = #queue - 1

  if depActionCount == 0 then
    -- Simple upgrade: remove then install via event-driven queue
    mpkg.echo(f"Upgrading <b>{args}</b> from v{installedVersion} to v{repoVersion}.")
    mpkg.startInstallQueue(queue)
  else
    local depWord = depActionCount == 1 and "dependency" or "dependencies"
    mpkg.echo(f"Upgrading <b>{args}</b> from v{installedVersion} to v{repoVersion} — also resolving {depActionCount} {depWord}.")
    mpkg.startInstallQueue(queue)
  end

  return true
end


--- Fetch the latest package information from the repository.
-- @param silent if true, do not display update messages
function mpkg.updatePackageList(silent)
  local saveto = getMudletHomeDir() .. "/" .. mpkg.filename
  downloadFile(saveto, mpkg.repository .. "/" .. mpkg.filename)
  if not silent then
    mpkg.echo("Updating package listing from repository.")
    mpkg.displayUpdateMessage = true
    mpkg.silentFailures = nil
  end
end


--- Print a list of locally installed packages in Mudlet.
function mpkg.listInstalledPackages()

  if not mpkg.ready() then return end

  local sf = string.format

  mpkg.echo("Listing installed packages:")

  for _,v in pairs(getPackages()) do
    local version, error = mpkg.getInstalledVersion(v)
    if error then
      mpkg.echoLink("  ", sf("<b>%-30s</b> %-20s\n", v, "(unknown version)"), function() mpkg.show(v) end, "show details", true)
    else
      mpkg.echoLink("  ", sf("<b>%-30s</b> %-20s", v, f"(v{mpkg.getInstalledVersion(v)})"), function() mpkg.show(v) end, "show details", true)

      local installed = mpkg.getInstalledVersion(v)
      local repo = mpkg.getRepositoryVersion(v)
      if installed and repo and semver(installed) < semver(repo) then
        echoLink("", "[update available]\n", function() mpkg.upgrade(v) end, "click to update package", true)
      else
        echo("\n")
      end
    end
  end

  local count = table.size(getPackages())
  mpkg.echo(count == 1 and f"{count} package installed." or f"{count} packages installed.")

end


--- Search for a package using keywords.
-- This will search both title and description fields as set in the package information
-- (config.lua) when the package was created.
-- @param args the keywords to search for
-- @return false if no matches were found
-- @return true if matches were found
function mpkg.search(args)

  if not args then
    mpkg.echo("Missing package name.")
    mpkg.echo("Syntax: mpkg search <package_name>")
    return
  end

  if not mpkg.ready() then return end

  mpkg.echo(f"Searching repository for <b>{args}</b>.")

  local count = 0

  args = string.lower(args)

  local packages = mpkg.packages["packages"]

  for i = 1, #packages do
    if string.find(string.lower(packages[i]["mpackage"]), args, 1, true) or string.find(string.lower(packages[i]["title"]), args, 1, true) then
      mpkg.echo("")
      mpkg.echoLink("  ", f"<b>{packages[i]['mpackage']}</b> (v{packages[i]['version']}) ", function() mpkg.show(packages[i]["mpackage"], true) end, "show details", true)
      if table.contains(getPackages(), packages[i]["mpackage"]) then
        echo("[installed]\n")
      else
        echoLink("", "[install now]\n", function() mpkg.install(packages[i]["mpackage"]) end, "install now", true)
      end
      mpkg.echo(f"  {packages[i]['title']}")
      count = count + 1
    end
  end

  if count == 0 then
    mpkg.echo("No matching packages found.")
    return false
  end

  return true

end


--- Print out detailed package information.
-- Display; title, version, author, installation status, description.
-- @param args the package name as listed in the repository
-- @param repoOnly skip local details, show only repository info
-- @return false if error or no matching package was found
-- @return true if information was displayed
function mpkg.show(args, repoOnly)

  if not args then
    mpkg.echo("Missing package name.")
    if repoOnly then
      mpkg.echo("Syntax: mpkg show-repo <package_name>")
    else
      mpkg.echo("Syntax: mpkg show <package_name>")
    end
    return false
  end

  if not mpkg.ready() then return end

  local packages

  if not repoOnly then
    -- search locally first, then the repository if nothing was found
    packages = getPackages()

    for _, pkg in pairs(packages) do
      if string.lower(args) == string.lower(pkg) then
        local name = getPackageInfo(pkg, "mpackage")
        local title = getPackageInfo(pkg, "title")
        local version = getPackageInfo(pkg, "version")

        if name == "" then
          mpkg.echo("This package does not contain any further details.  It was likely installed from a XML import and not an mpackage.")
        else
          mpkg.echo(f"Package: <b>{name}</b>")
          mpkg.echo(f"         {title}")
          mpkg.echo("")
          mpkg.echo(f"Status: <b>installed</b> (version: {version})")
          mpkg.echo("")
          mpkg.echo("Description:")

          local description = string.split(getPackageInfo(pkg, "description"), "\n")

          for i = 1, #description do
            mpkg.echo(description[i])
          end
        end

        -- check it's not a non-versioned XML/package first
        local installedVersion = mpkg.getInstalledVersion(pkg)
        local repoVersion = mpkg.getRepositoryVersion(pkg)
        if installedVersion and repoVersion and semver(installedVersion) < semver(repoVersion) then
          mpkg.echo("")
          mpkg.echoLink("There is a ", "<b>newer version available.</b>\n", function() mpkg.show(pkg, true) end, "view details", true)
        end

        return true
      end
    end

    mpkg.echo(f"No package matching <b>{args}</b> found locally, search the repository.")

  end

  -- now search the repository
  packages = mpkg.packages["packages"]

  for i = 1, #packages do
    if string.lower(args) == string.lower(packages[i]["mpackage"]) then
      mpkg.echo(f"Package: <b>{packages[i]['mpackage']}</b> (version: {packages[i]['version']}) by {packages[i]['author']}")
      mpkg.echo(f"         {packages[i]['title']}")
      mpkg.echo("")

      local version = getPackageInfo(args, "version")

      if version == "" then
        mpkg.echoLink("Status: not installed  ", "[install now]\n", function() mpkg.install(packages[i]["mpackage"]) end, "install now", true)
      else
        mpkg.echo(f"Status: <b>installed</b> (version: {version})")
      end

      -- Show dependency constraints if this package has any
      local depSpecs = mpkg.getDependencySpecs(packages[i]["mpackage"])
      if depSpecs and #depSpecs > 0 then
        mpkg.echo("")
        local depParts = {}
        for _, spec in ipairs(depSpecs) do
          table.insert(depParts, f"{spec.name} {mpkg.formatDependencyConstraint(spec)}")
        end
        mpkg.echo(f"Dependencies: {table.concat(depParts, ', ')}")
      end

      mpkg.echo("")

      local description = string.split(packages[i]["description"], "\n")

      for i = 1, #description do
        mpkg.echo(description[i])
      end

      return true
    end
  end

  mpkg.echo(f"No package matching <b>{args}</b> found in the repository. Try <yellow>mpkg search<reset>.")
  return false

end


--- Reacts to downloading of repository files and package install/uninstall events.
-- Also drives the sequential install queue used for dependency resolution.
-- @param event the event name; sysDownloadError, sysDownloadDone,
--              sysInstallPackage, or sysUninstallPackage
-- @param ... event arguments (Mudlet also populates the global arg[] table)
function mpkg.eventHandler(event, ...)

  -- Download error — check which download failed
  if event == "sysDownloadError" then
    if string.ends(arg[2], mpkg.filename) then
      -- Repository listing failed
      if not mpkg.silentFailures then
        mpkg.echo("Failed to download package listing.")
        mpkg.silentFailures = true
      end
    else
      -- Check whether the failed download belongs to our install queue.
      -- arg[2] is the local save path; installPackage saves to a path that
      -- ends with the original filename, so a suffix match is reliable.
      local q = mpkg.installQueue
      if q and q.currentFilename and
         string.ends(string.lower(arg[2] or ""), string.lower(q.currentFilename)) then
        mpkg.echo(f"Package download failed: {arg[1]}.  Installation queue aborted.")
        mpkg.installQueue = nil
      end
    end
    return
  end

  -- Repository listing downloaded successfully
  if event == "sysDownloadDone" and arg[1] == getMudletHomeDir() .. "/" .. mpkg.filename then

    if mpkg.displayUpdateMessage then
      mpkg.echo("Package listing downloaded.")
      mpkg.displayUpdateMessage = nil
    end

    local file, error, content = io.open(arg[1])

    if error then
      mpkg.echo(f"Error reading package listing file.  Please file a bug report at {mpkg.maintainer}")
    else
      content = file:read("*a")
      mpkg.packages = json_to_value(content)
      io.close(file)
      mpkg.checkForUpgrades(true)
    end

    if semver(mpkg.getInstalledVersion("mpkg")) < semver(mpkg.getRepositoryVersion("mpkg")) then
      mpkg.echo(f"New version of mpkg found.  Automatically upgrading to {mpkg.getRepositoryVersion('mpkg')}")
      mpkg.remove("mpkg")
      tempTimer(2, function() mpkg.install("mpkg") end)
    end
    return
  end

  -- Package uninstalled
  if event == "sysUninstallPackage" then
    if arg[1] == "mpkg" then
      mpkg.uninstallSelf()
      return
    end

    -- If the install queue was waiting on this uninstall, perform the queued install
    local q = mpkg.installQueue
    if q and q.pendingAfterUninstall and
       string.lower(q.pendingAfterUninstall.name) == string.lower(arg[1]) then
      local item              = q.pendingAfterUninstall
      q.pendingAfterUninstall = nil
      -- Brief delay to allow Mudlet to finish processing the uninstall
      tempTimer(0.5, function()
        -- Record which package we now expect sysInstallPackage for
        q.currentlyInstalling = string.lower(item.name)
        q.currentFilename     = item.filename
        mpkg.echo(f"Installing <b>{item.name}</b> (v{item.version})...")
        installPackage(f"{mpkg.repository}/{item.filename}")
        -- sysInstallPackage will advance the queue to the next item
      end)
    end
    return
  end

  -- Package installed
  if event == "sysInstallPackage" then
    if arg[1] == "mpkg" then
      mpkg.displayHelp()
    end
    -- Advance the queue only when the package we were waiting for has installed.
    -- This prevents installs triggered by other means (e.g. the GUI) from
    -- accidentally skipping ahead in the queue.
    local q = mpkg.installQueue
    if q and not q.pendingAfterUninstall and
       q.currentlyInstalling and
       string.lower(arg[1]) == q.currentlyInstalling then
      q.currentlyInstalling = nil
      tempTimer(0.5, function() mpkg.processInstallQueue() end)
    end
    return
  end

end

--- Open a browser at the uploads URL.
function mpkg.openWebUploads()

  mpkg.echo("Redirecting to the package repository website.")
  openUrl(mpkg.websiteUploads)

end

-- clean up after uninstallation of mpkg
function mpkg.uninstallSelf()

  deleteNamedTimer("mpkg", "mpkg update package listing timer")

  deleteNamedEventHandler("mpkg", "download")
  deleteNamedEventHandler("mpkg", "download-error")
  deleteNamedEventHandler("mpkg", "installed")
  deleteNamedEventHandler("mpkg", "uninstalled")

  if mpkg and mpkg.aliases then
    for _, v in pairs(mpkg.aliases) do
      killAlias(v)
    end
  end

  mpkg.aliases = nil

end

-- call the script entry point function
-- delay this because we need semantic versioning to be loaded as well
tempTimer(0, function() mpkg.initialise() end, false)
