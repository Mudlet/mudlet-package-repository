-- Requires:
-- sudo apt install libzzip-dev
-- sudo luarocks install json-lua
-- sudo luarocks install luazip
-- sudo luarocks install luafilesystem

local json = require "JSON"
local zip = require "zip"
local lfs = require "lfs"

-- Create icons directory if it doesn't exist
lfs.mkdir("upload-site/public/icons")

local function getFileModTime(filepath)
    local attr = lfs.attributes(filepath)
    if attr and attr.mode == "file" then
        return attr.modification
    end
    return os.time() -- fallback to current time if we can't get the file time
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

local function extractIcon(zfile, packageName, iconPath)
    if not iconPath then return nil end
    
    local iconFile, err = zfile:open(iconPath)
    if not iconFile then return nil end
    
    local iconData = iconFile:read("*a")
    iconFile:close()
    
    -- Get the file extension from iconPath
    local extension = iconPath:match("^.+(%..+)$") or ".png"
    
    -- Save icon with package name and original extension
    local iconFilename = "upload-site/public/icons/" .. packageName .. extension
    local f = io.open(iconFilename, "wb")
    if f then
        f:write(iconData)
        f:close()
        return "/icons/" .. packageName .. extension
    end
    return nil
end

local pkg = {}

print("Running creation loop...")

-- loop through all .mpackage files in the directory
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
            ["uploaded"] = getFileModTime(file),
            ["filename"] = file:gsub("packages/", ""),
            ["icon"] = iconUrl
        })

        f1:close()
        zfile:close()
    end
end

local index = {}

table.insert(index, { ["name"] = "mudlet package repository listing", ["updated"] = os.date("%c"), ["packages"] = pkg } )

indexFile = io.open("packages/mpkg.packages.json", "w+")
io.output(indexFile)
io.write(json:encode_pretty(index[1], nil, { pretty = true, align_keys = true, array_newline = true, indent = "  " }))
io.close(indexFile)
