-- Requires:
-- sudo apt install libzzip-dev
-- sudo luarocks install json-lua
-- sudo luarocks install luazip
-- sudo luarocks install luafilesystem

local json = require "JSON"
local zip = require "zip"
local lfs = require "lfs"
local yajl = require "yajl"

-- Create icons directory if it doesn't exist
lfs.mkdir("packages/icons")


local function urlEncode(str)
    local encodeChars = {
        -- [" "] = "%20", -- spaces are commented out for better URL aesthetic
        ["!"] = "%21",
        ["#"] = "%23",
        ["$"] = "%24",
        ["%"] = "%25",
        ["&"] = "%26",
        ["'"] = "%27",
        ["("] = "%28",
        [")"] = "%29",
        ["*"] = "%2A",
        ["+"] = "%2B",
        [","] = "%2C",
        ["/"] = "%2F",
        [":"] = "%3A",
        [";"] = "%3B",
        ["="] = "%3D",
        ["?"] = "%3F",
        ["@"] = "%40",
        ["["] = "%5B",
        ["]"] = "%5D"
    }

  return str:gsub("[^%w]", encodeChars)
end

-- When each package landed, according to git rather than to the filesystem. A checkout
-- has no upload dates to report: git writes every file at clone time, so dating packages
-- by their mtime makes the entire repository look like it was uploaded today.
local function readUploadTimes()
    local times = {}

    -- One walk of the history, newest first, so the first commit that names a path is the
    -- one that last touched it. --first-parent -m dates a package by the commit that
    -- brought it into this branch, which for a merged pull request is the merge itself and
    -- not whenever the branch happened to be written. quotePath off keeps non-ASCII
    -- filenames spelled the way the package loop below sees them, rather than as escapes.
    local out = io.popen("git -c core.quotePath=false log --first-parent -m --format=@%ct --name-only -- packages")
    if not out then return times end

    local commitTime
    for line in out:lines() do
        local timestamp = line:match("^@(%d+)$")
        if timestamp then
            commitTime = tonumber(timestamp)
        elseif commitTime and line ~= "" and not times[line] then
            times[line] = commitTime
        end
    end
    out:close()

    return times
end

local uploadTimes = readUploadTimes()

local function getUploadTime(filepath)
    -- Not committed yet: a package the history has never seen is as new as it gets.
    return uploadTimes[filepath] or os.time()
end

local function clearPackageVariables()
    mpackage = nil
    author = nil
    title = nil
    description = nil
    created = nil
    version = nil
    icon = nil
end

local function extractIcon(zfile, packageName, iconName)
    if not iconName then return nil end

    local iconPath = ".mudlet/Icon/" .. iconName
    local iconFile, err = zfile:open(iconPath)
    if not iconFile then return nil end

    local iconData = iconFile:read("*a")
    iconFile:close()

    -- Get the file extension from iconName
    local extension = iconName:match("^.+(%..+)$") or ".png"

    -- Save icon with URL-encoded package name and original extension
    local iconFilename = "packages/icons/" .. urlEncode(packageName) .. extension
    local f = io.open(iconFilename, "wb")
    if f then
        f:write(iconData)
        f:close()
        return iconFilename
    end
    return nil
end

local pkg = {}

print("Running creation loop...")

-- loop through all .mpackage files in the directory
local packagecount = 0
for file in io.popen("ls -pa packages/*"):lines() do
    clearPackageVariables()
    print("Found "..file)

    -- read config.lua from the zip file
    local zfile, err = zip.open(file)
    if not err then
        local f1, err = zfile:open('config.lua')
        local s1 = f1:read("*a")

        -- output config.lua and run it to gather the variables inside
        infoFile = io.open("config.lua", "w+")
        io.output(infoFile)
        io.write(s1)
        io.close(infoFile)
        dofile("config.lua")

        packagecount = packagecount + 1

        -- Extract icon if present
        local iconUrl = nil
        if icon then
            iconUrl = extractIcon(zfile, mpackage, icon)
        end

        -- insert package details in table
        table.insert(pkg, {
            ["mpackage"] = mpackage,
            ["author"] = author,
            ["title"] = title,
            ["description"] = description,
            ["created"] = created,
            ["version"] = version,
            ["uploaded"] = getUploadTime(file),
            ["filename"] = file:gsub("packages/", ""),
            ["icon"] = iconUrl
        })

        f1:close()
        zfile:close()

        -- Write JSON file after each package
        local index = { ["name"] = "mudlet package repository listing", ["updated"] = os.date("%c"), ["packages"] = pkg }
        local indexFile = io.open("packages/mpkg.packages.json", "w+")
        io.output(indexFile)
        io.write(json:encode_pretty(index, nil, { pretty = true, align_keys = true, array_newline = true, indent = "  " }))
        io.close(indexFile)

        -- Validate JSON after each package
        local f = io.open("packages/mpkg.packages.json", "r")
        local content = f:read("*a")
        f:close()

        local success, result = pcall(yajl.to_value, content)
        if not success then
            error("Generated JSON file failed YAJL validation after adding package " .. mpackage .. ": " .. tostring(result))
        end
    end
end

print("Finished processing " .. packagecount .. " packages in the repository.")
