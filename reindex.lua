-- Requires:
-- sudo apt install libzzip-dev
-- sudo luarocks install json
-- sudo luarocks install luazip

local json = require "JSON"
local zip = require "zip"

local pkg = {}

-- loop through all .mpackage files in the directory
for file in io.popen([[ls -pa *.mpackage | grep -v /]]):lines() do
    print("Found "..file)

    -- read config.lua from the zip file
    local zfile, err = zip.open(file)
    local f1, err = zfile:open('config.lua')
    local s1 = f1:read("*a")

    -- output config.lua and run it to gather the variables inside
    infoFile = io.open("config.lua", "w+")
    io.output(infoFile)
    io.write(s1)
    io.close(infoFile)
    dofile("config.lua")

    -- insert package details in table
    table.insert(pkg, { ["mpackage"] = mpackage, ["author"] = author, ["title"] = title, ["description"] = description, ["created"] = created, ["version"] = version} )

    f1:close()
    zfile:close()

end

local index = {}

table.insert(index, { ["name"] = "mudlet package repository listing", ["updated"] = os.date("%c"), ["packages"] = pkg } )

indexFile = io.open("mpkg.packages.json", "w+")
io.output(indexFile)
io.write(json:encode(index[1]))
io.close(indexFile)
