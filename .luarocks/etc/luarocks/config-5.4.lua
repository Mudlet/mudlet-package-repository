-- LuaRocks configuration

rocks_trees = {
   { name = "user", root = home .. "/.luarocks" };
   { name = "system", root = "/home/runner/work/mudlet-package-repository/mudlet-package-repository/.luarocks" };
}
lua_interpreter = "lua";
variables = {
   LUA_DIR = "/home/runner/work/mudlet-package-repository/mudlet-package-repository/.lua";
   LUA_BINDIR = "/home/runner/work/mudlet-package-repository/mudlet-package-repository/.lua/bin";
}
