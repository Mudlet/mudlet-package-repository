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

  table.insert(mpkg.aliases, tempAlias("^(mpkg|mp)( help)?$", mpkg.displayHelp))
  table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) install(?: (.+))?$", function() mpkg.install(matches[3]) end))
  table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) list$", mpkg.listInstalledPackages))
  table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) remove(?: (.+))?$", function() mpkg.remove(matches[3]) end))
  table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) show(?: (.+))?$", function() mpkg.show(matches[3]) end))
  table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) search(?: (.+))?$", function() mpkg.search(matches[3]) end))
  table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) update$", function() mpkg.updatePackageList(false) end))

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


--- Get a table of dependencies this package requires to be installed.
-- @param args the package name as listed in the repository
-- @return nil and error message if not found
-- @return an empty table (if no dependencies) or table containing package names if found
function mpkg.getDependencies(args)

  if not mpkg.ready() then return end

  local packages = mpkg.packages["packages"]

  for i = 1, #packages do
    if args == packages[i]["mpackage"] then
      if packages[i]["dependencies"] then
        return string.split(packages[i]["dependencies"], ",")
      else
        return {}
      end
    end
  end

  return nil, "Package does not exist in repository."
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
-- @param silent do not show mpkg messages, system messages will continue to show
function mpkg.performUpgradeAll(silent)

  if not mpkg.ready() then return end

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

  if not table.is_empty(requireUpgrade) then
    if not silent then
      mpkg.echo("New package upgrades available.  The following packages will be upgraded:")
      mpkg.echo("")
      for _, pkg in pairs(requireUpgrade) do
        mpkg.echo(f"<b>{pkg}</b> v{mpkg.getInstalledVersion(pkg)} to v{mpkg.getRepositoryVersion(pkg)}")
      end
    end
    for _, pkg in pairs(requireUpgrade) do
      mpkg.upgrade(pkg)
    end
  else
    if not silent then
      mpkg.echo("No package upgrades are available.")
    end
  end

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


--- Install a new package from the repository.
-- @param args the package name as listed in the repository
-- @return false if there was an error
-- @return true if package was installed successfully
function mpkg.install(args)

  if not args then
    mpkg.echo("Missing package name.")
    mpkg.echo("Syntax: mpkg install <package_name>")
    return false
  end

  if not mpkg.ready() then return end

  local installedPackages = getPackages()

  for _, pkg in pairs(installedPackages) do
    if string.lower(pkg) == string.lower(args) then
      mpkg.echo(f"<b>{pkg}</b> package is already installed.  Checking for updates.")
      mpkg.upgrade(pkg)
      return false
    end
  end

  local packages = mpkg.packages["packages"]

  for i = 1, #packages do
    if string.lower(args) == string.lower(packages[i]["mpackage"]) then
      -- check for dependencies
      local depends = mpkg.getDependencies(packages[i]["mpackage"])

      if depends then

        local unmet = {}

        for _, dep in pairs(depends) do
          if not table.contains(getPackages(), dep) then
            table.insert(unmet, dep)
          end
        end

        -- TODO: automatic dependency resolution?
        if not table.is_empty(unmet) then
          mpkg.echo("This package has unmet dependencies.")
          mpkg.echo("Please install the following packages first.")
          mpkg.echo("")

          for _, v in pairs(unmet) do
            mpkg.echo(v)
          end

          return false
        end
      end

      mpkg.echo(f"Installing <b>{args}</b> (v{packages[i]['version']}).")
      installPackage(f"{mpkg.repository}/{packages[i]['filename']}")
      return true

    end
  end

  mpkg.echo(f"Unable to locate <b>{args}</b> package in repository.")

  return false
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


--- Upgrade a locally installed package to a new repository version.
-- A convenience function which simply calls mpkg.remove and mpkg.install
-- @param args the package name as listed in the repository
-- @return false if there was an error
-- @return true if packages was successfully uninstalled/removed
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
  local repoVersion = mpkg.getRepositoryVersion(args)
  if installedVersion and repoVersion and semver(installedVersion) < semver(repoVersion) then
    -- if no errors removing then install
    if mpkg.remove(args) then
      tempTimer(2, function() mpkg.install(args) end)
    end
  else
    mpkg.echo(f"Currently installed, <b>{args}</b> v{mpkg.getInstalledVersion(args)} is the latest version.")
  end
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


--- Reacts to downloading of repository files and self install/uninstall events.
-- @param event the event which called this handler; sysDownloadError, sysDownloadDone
-- @param arg all event args, including the filename associated with the download
function mpkg.eventHandler(event, ...)

  if event == "sysDownloadError" and string.ends(arg[2], mpkg.filename) then
    if not mpkg.silentFailures then
      mpkg.echo("Failed to download package listing.")
      mpkg.silentFailures = true
    end
    return
  end

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
  end

  if event == "sysUninstallPackage" and arg[1] == "mpkg" then
    mpkg.uninstallSelf()
    return
  end

  if event == "sysInstallPackage" and arg[1] == "mpkg" then
    mpkg.displayHelp()
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
