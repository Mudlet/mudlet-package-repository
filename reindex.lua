-- Requires:
-- sudo apt install libzzip-dev
-- sudo luarocks install json-lua
-- sudo luarocks install luazip
-- sudo luarocks install luafilesystem

local json = require "JSON"
local zip = require "zip"
local lfs = require "lfs"

local function getFileModTime(filepath)
    local attr = lfs.attributes(filepath)
    if attr and attr.mode == "file" then
        return attr.modification
    end
    return os.time() -- fallback to current time if we can't get the file time
end

local pkg = {}

print("Running creation loop...")

-- loop through all .mpackage files in the directory
for file in io.popen("ls -pa packages/*"):lines() do
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

        -- insert package details in table
        table.insert(pkg, {
            ["mpackage"] = mpackage,
            ["author"] = author,
            ["title"] = title,
            ["description"] = description,
            ["created"] = created,
            ["version"] = version,
            ["uploaded"] = getFileModTime(file),
            ["filename"] = file:gsub("packages/", "")
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
