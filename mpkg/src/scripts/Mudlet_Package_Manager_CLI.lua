--- Command line package manager for Mudlet.
--

mpkg = mpkg or {}
mpkg.debug = mpkg.debug or false
mpkg.handlers = mpkg.handlers or {}
mpkg.aliases = mpkg.aliases or {}
mpkg.maintainer = "https://github.com/mudlet/mudlet-package-repository/issues"
mpkg.repository = "https://mudlet.github.io/mudlet-package-repository/packages"
mpkg.filename = "mpkg.packages.json"
mpkg.help = [[<u>Mudlet Package Repository (mpkg)</u>

A command line package manager for Mudlet.

Commands:
  mpkg help             -- show this help
  mpkg install          -- install a new package
  mpkg list             -- list all installed packages
  mpkg remove           -- remove an existing package
  mpkg search           -- search for a package via name and description
  mpkg show             -- show detailed information about a package
  mpkg update           -- update your package listing
  mpkg upgrade          -- upgrade a specific package
  mpkg upgradeable      -- show packages that can be upgraded
  mpkg debug            -- turn on debugging messages]]


--- Entry point of script.
--  If we switch to an event handler this will be the function that is to be called.
function mpkg.initialise()
    mpkg.updatePackageList()
end


--- Pretty print any script echoes to users know where the information came from.
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



--- Get which version of a package is installed on in Mudlet.
-- @param args the package name as found in getPackageInfo()
-- @return nil and error message if not found
-- @return string containing a version if found
function mpkg.getInstalledVersion(args)
    local installedVersion = getPackageInfo(args, "version")

    if installedVersion == "" then
      return nil, "No version found."
    else
      return installedVersion
    end

    return nil, "No package found."
end


--- Get which version of a package is available in the repository.
-- @param args the package name as listed in the repository
-- @return nil and error message if not found
-- @return string containing a version if found
function mpkg.getRepositoryVersion(args)
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
function mpkg.checkForUpgrades()
  local packages = mpkg.packages["packages"]
  local requireUpgrade = {}

  for k,v in pairs(getPackages()) do
    local installedVersion, iError = mpkg.getInstalledVersion(v)
    local repoVersion, rError = mpkg.getRepositoryVersion(v)

    if mpkg.debug then
      if iError then
        mpkg.echo("Checking local package <green>'" .. v .. "': version '" .. iError .. "'<reset>")
      else
        mpkg.echo("Checking local package <green>'" .. v .. "': version '" .. installedVersion .. "'<reset>")
      end

      if repoVersion then
        mpkg.echo("Checking repo package <green>'" .. v .. "': version '" .. repoVersion .. "'<reset>")
      else
        mpkg.echo("Package not in repository <green>'" .. v .. "'<reset>")
      end
    end

    if repoVersion and installedVersion then
      if semver(installedVersion) < semver(repoVersion) then
        table.insert(requireUpgrade, v)
      end
    end
  end

  if not table.is_empty(requireUpgrade) then
    mpkg.echo("The following packages can be upgraded;")
    mpkg.echo("")
    for k,v in pairs(requireUpgrade) do
      mpkg.echoLink("<b>" .. v .. "</b>" .. " v" .. mpkg.getInstalledVersion(v) .. " to v" .. mpkg.getRepositoryVersion(v), " (<b>click to upgrade</b>)\n", function() mpkg.upgrade(v) end, "Click to upgrade", true)
    end
    return
  else
    mpkg.echo("All packages are up to date.")
  end
end


--- Print the help file.
function mpkg.displayHelp()

  local help = string.split(mpkg.help, "\n")

  for i = 1, #help do
    mpkg.echo(help[i])
  end

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

  if table.contains(getPackages(), args) then
    mpkg.echo("<b>" .. args .. "</b>" .. " is already installed, use <yellow>mpkg upgrade<reset> to install a newer version.")
    return false
  end

  local packages = mpkg.packages["packages"]

  for i = 1, #packages do
    if args == packages[i]["mpackage"] then
      -- check for dependencies
      local depends = mpkg.getDependencies(args)

      if depends then

        local unmet = {}

        for _,v in pairs(depends) do
          if not table.contains(getPackages(), v) then
            table.insert(unmet, v)
          end
        end

        -- TODO: automatic dependency resolution?
        if not table.is_empty(unmet) then
          mpkg.echo("This package has unmet dependencies.")
          mpkg.echo("Please install the following modules first.")
          mpkg.echo("")

          for _,v in pairs(unmet) do
            mpkg.echo(v)
          end

          return false
        end
      end

      mpkg.echo("Installing <b>" .. args .. "</b> (version " .. packages[i]["version"] .. ").")
      installPackage(mpkg.repository .. "/" .. args .. ".mpackage")
      return true

    end
  end

  mpkg.echo("Unable to locate <b>" .. args .. "</b> in repository.")
  
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

  if not table.contains(getPackages(), args) then
    mpkg.echo("<b>" .. args .. "</b> package is not currently installed.")
    return false
  end

  local success = uninstallPackage(args)
  mpkg.echo("<b>" .. args .. "</b> removed.")

  -- TODO: uninstallPackage doesn't currently provide a return value
  -- is it necessary to perform a post check on installed packages and compare?
  --[[
  if success then
    mpkg.echo(args .. "uninstalled.")
  else
    mpkg.echo("Unable to uninstall.")
  end
  ]]--
  
  return true
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
    return false
  end
  
  -- if no errors removing then install
  if mpkg.remove(args) then
    tempTimer(2, function() mpkg.install(args) end)
  end
end


--- Fetch the latest package information from the repository.
function mpkg.updatePackageList()
  local saveto = getMudletHomeDir() .. "/" .. mpkg.filename
  downloadFile(saveto, mpkg.repository .. "/" .. mpkg.filename)
  mpkg.echo("Updating package listing from repository.")
end


--- Print a list of locally installed packages in Mudlet.
function mpkg.listInstalledPackages()

  mpkg.echo("Listing locally installed packages:")

  if mpkg.debug then
    mpkg.echo("DEBUG:")
    display(getPackages())
  end

  for _,v in pairs(getPackages()) do
    local version, error = mpkg.getInstalledVersion(v)
    if error then
      mpkg.echo("  <b>" .. v .. "</b> (unknown version)")
    else
      mpkg.echo("  <b>" .. v .. "</b> (version: " .. mpkg.getInstalledVersion(v) .. ")")
    end
  end

  local count = table.size(getPackages())
  mpkg.echo(count == 1 and count .. " package installed." or count .. " packages installed.")

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

  mpkg.echo("Searching for <b>" .. args .. "</b> in repository.")

  local count = 0

  args = string.lower(args)

  local packages = mpkg.packages["packages"]

  for i = 1, #packages do
    if string.find(string.lower(packages[i]["mpackage"]), args, 1, true) or string.find(string.lower(packages[i]["title"]), args, 1, true) then
      mpkg.echo("")
      mpkg.echo("Package: <b>" .. packages[i]["mpackage"] .. "</b> (version: " .. packages[i]["version"] .. ")")
      mpkg.echo("         " .. packages[i]["title"] .. "")
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
-- @return false if error or no matching package was found
-- @return true if information was displayed
function mpkg.show(args)

  if not args then
    mpkg.echo("Missing package name.")
    mpkg.echo("Syntax: mpkg show <package_name>")
    return false
  end

  local packages = mpkg.packages["packages"]

  for i = 1, #packages do
    if args == packages[i]["mpackage"] then

      mpkg.echo("Package: <b>" .. packages[i]["mpackage"] .. "</b> (version: " .. packages[i]["version"] .. ") by " .. packages[i]["author"])
      mpkg.echo("         " .. packages[i]["title"])
      mpkg.echo("")

      local installedVersion = mpkg.getInstalledVersion(packages[i]["mpackage"])
      if installedVersion then
        mpkg.echo("Status: <b>installed</b> (version: " .. installedVersion .. ")")
      else
        mpkg.echo("Status: not installed")
      end

      mpkg.echo("")

      local description = string.split(packages[i]["description"], "\n")

      for i = 1, #description do
        mpkg.echo(description[i])
      end

      return true
    end
  end

  mpkg.echo("No package matching <b>" .. args .. "</b> found in repository. Try <yellow>mpkg search<reset>.")
  return false

end


--- Toggles debugging information for program diagnostics.
-- Prints out further information when debug is true (default: false) when calling;
-- checkForUpgrades(), listInstalledPackages(), whenever the eventHandler is fired.
function mpkg.toggleDebug()

  if mpkg.debug then
    mpkg.debug = false
    mpkg.echo("mpackage debugging disabled.")
  else
    mpkg.debug = true
    mpkg.echo("mpackage debugging <b>ENABLED</b>.")
  end

end


--- Reacts to downloading of repository files.
-- @param event the event which called this handler; sysDownloadError, sysDownloadDone
-- @param args all event args, including the filename associated with the download
function mpkg.eventHandler(event, ...)

  if mpkg.debug then
    display(event)
    display(arg)
  end

  if event == "sysDownloadError" and string.ends(arg[2], mpkg.filename) then
    mpkg.echo("Failed to download package listing.")
    return
  end

  if event == "sysDownloadDone" and arg[1] == getMudletHomeDir() .. "/" .. mpkg.filename then
    mpkg.echo("Package listing downloaded.")

    local file, error, content = io.open(arg[1])

    if error then
      mpkg.echo("Error reading package listing file.  Please file a bug report at " .. mpkg.maintainer)
    else
      content = file:read("*a")
      mpkg.packages = json_to_value(content)
      io.close(file)
      mpkg.checkForUpgrades()
    end
    
    if semver(mpkg.getInstalledVersion("mpkg")) < semver(mpkg.getRepositoryVersion("mpkg")) then
      mpkg.echo("New version of mpkg found, automatically upgrading to " .. mpkg.getRepositoryVersion("mpkg"))
      mpkg.remove("mpkg")
      tempTimer(2, function() mpkg.install("mpkg") end)
    end    
  end

end


-- Setup the event handlers, removing any previous ones.
for _,v in pairs(mpkg.handlers) do
  killAnonymousEventHandler(v)
end

mpkg.handlers = {}

table.insert(mpkg.handlers, registerAnonymousEventHandler("sysDownloadDone", "mpkg.eventHandler"))
table.insert(mpkg.handlers, registerAnonymousEventHandler("sysDownloadError", "mpkg.eventHandler"))

-- Setup the command line aliases, removing any previous ones.
for _,v in pairs(mpkg.aliases) do
  killAlias(v)
end

mpkg.aliases = {}

table.insert(mpkg.aliases, tempAlias("^(mpkg|mp)( help)?$", mpkg.displayHelp))
table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) debug$", mpkg.toggleDebug))
table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) install(?: (.+))?$", function() mpkg.install(matches[3]) end))
table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) remove(?: (.+))?$", function() mpkg.remove(matches[3]) end))
table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) list$", mpkg.listInstalledPackages))
table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) update$", mpkg.updatePackageList))
table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) upgrade(?: (.+))?$", function() mpkg.upgrade(matches[3]) end))
table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) upgradeable$", mpkg.checkForUpgrades))
table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) show(?: (.+))?$", function() mpkg.show(matches[3]) end))
table.insert(mpkg.aliases, tempAlias("^(mpkg|mp) search(?: (.+))?$", function() mpkg.search(matches[3]) end))

-- call the script entry point function
mpkg.initialise()
