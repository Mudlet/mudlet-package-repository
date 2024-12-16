local json = require "JSON"
local lfs = require "lfs"

local WHATS_NEW_COUNT = 5

local function readFile(args)

    --print(args)

    local file = assert(io.open(args, "r"))
    io.input(file)
    local contents = io.read("*a")
    io.close(file)

    return contents
end

local packages = json:decode(readFile("packages/mpkg.packages.json"))

local function getRecentModifiedPackages(directory, count)

    count = count or 5

    local files = {}

    for file in lfs.dir(directory) do
        if string.match(file, "%.mpackage$" ) then
            local filepath = directory .. "/" .. file
            local attr = lfs.attributes(filepath)

            if attr and attr.mode == "file" then
                table.insert(files, {
                    name = filepath,
                    modification = attr.modification
                })
            end
        end
    end

    for i = 1, #files do
        print(string.format("%-40s %s", files[i].name, os.date("%Y-%m-%d %H:%M:%S", files[i].modification)))
    end

    -- Sort files by modification time (newest first)
    table.sort(files, function(a, b)
        return a.modification > b.modification
    end)

    -- Extract just the filenames from the sorted results
    local result = {}
    for i = 1, math.min(count, #files) do
        local listing = files[i].name
        listing = string.gsub(listing, "packages/", "")
        listing = string.gsub(listing, ".mpackage", "")
        table.insert(result, listing)
    end

    return result
end


local function buildWhatsNew()

    -- html section preamble
    local whatsNewHtml = [[    <section id="pageContent">
        <main role="main">
        <h2>Recent Uploads</h2><br><br>]]

    -- pull the 5 latest entries
    local whatsNew = getRecentModifiedPackages("packages", WHATS_NEW_COUNT)

    for j = 1, #whatsNew do
        for i = 1, #packages["packages"] do
            if packages["packages"][i]["mpackage"] == whatsNew[j] then
                local link = "<a href=\"http://mudlet.github.io/mudlet-package-repository/packages/" .. packages["packages"][i]["mpackage"] .. ".mpackage\">" .. packages["packages"][i]["mpackage"] .. "</a>"
                whatsNewHtml = whatsNewHtml .. "            <article>\n"
                whatsNewHtml = whatsNewHtml .. "                <h2>" .. link .. "</h2>\n"
                whatsNewHtml = whatsNewHtml .. "                <p>by " .. packages["packages"][i]["author"] .. ", version " .. packages["packages"][i]["version"] .. "</p><br><br>\n"
                whatsNewHtml = whatsNewHtml .. "                <p>" .. packages["packages"][i]["title"] .. "</p>\n"
                whatsNewHtml = whatsNewHtml .. "            </article>\n"
            end
        end
    end

    return whatsNewHtml
end

local function buildPackages()

    -- html section preamble
    local allPackagesHtml = [[    <section id="pageContent">
        <main role="main">]]

    local sortPackages = table.sort(packages.packages, function(a, b) return b.mpackage > a.mpackage end)

    for i = 1, #packages["packages"] do
        local link = "<a href=\"http://mudlet.github.io/mudlet-package-repository/packages/" .. packages["packages"][i]["mpackage"] .. ".mpackage\">" .. packages["packages"][i]["mpackage"] .. "</a>"
        allPackagesHtml = allPackagesHtml .. "            <article>\n"
        allPackagesHtml = allPackagesHtml .. "                <h2>" .. link .. "</h2>\n"
        allPackagesHtml = allPackagesHtml .. "                <p>by " .. packages["packages"][i]["author"] .. ", version " .. packages["packages"][i]["version"] .. "</p><br><br>\n"
        allPackagesHtml = allPackagesHtml .. "                <p>" .. packages["packages"][i]["title"] .. "</p>\n"
        allPackagesHtml = allPackagesHtml .. "            </article>\n"
    end

    return allPackagesHtml

end

local function writeHtmlIndex()

    local file = io.open("index.html", "w+")
    io.output(file)

    io.write(readFile("html/index-header.txt"))
    io.write(buildWhatsNew())
    io.write(readFile("html/index-footer.txt"))

    io.close(file)

end

local function writeHtmlRepo()

    local file = io.open("all-packages.html", "w+")
    io.output(file)

    io.write(readFile("html/all-packages-header.txt"))
    io.write(buildPackages())
    io.write(readFile("html/all-packages-footer.txt"))

    io.close(file)

end

print("Building web pages for repository.")
writeHtmlIndex()
writeHtmlRepo()
