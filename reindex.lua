-- sudo apt install libzzip-dev
-- sudo luarocks install inspect
-- sudo luarocks install json
-- sudo luarocks install luazip

local inspect = require "inspect"
local json = require "JSON"
local zip = require "zip"

local pkg = {}

for file in io.popen([[ls -pa *.mpackage | grep -v /]]):lines() do
    print("Found "..file)
--    table.insert(pkgs, file)

    local zfile, err = zip.open(file)
    local f1, err = zfile:open('config.lua')
    local s1 = f1:read("*a")
    infoFile = io.open("config.lua", "w+")
    io.output(infoFile)
    io.write(s1)
    io.close(infoFile)
    dofile("config.lua")

    table.insert(pkg, { ["mpackage"] = mpackage, ["author"] = author, ["title"] = title, ["description"] = description, ["created"] = created, ["version"] = version} )

    --print(inspect(pkg))

    f1:close()
    zfile:close()

end

local index = {}

table.insert(index, { ["name"] = "mudlet package repository listing", ["updated"] = os.date("%c"), ["packages"] = pkg } )

--print(json:encode(index))

indexFile = io.open("mpkg.packages.json", "w+")
io.output(indexFile)
io.write(json:encode(index[1]))
io.close(indexFile)
