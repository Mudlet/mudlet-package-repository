package = "LuaZip"
version = "1.2.5-1"
source = {
   url = "git://github.com/rjpcomputing/luazip",
   tag = "v1_2_5"
}
description = {
   summary = "Library for reading files inside zip files",
   detailed = [[
      LuaZip is a lightweight Lua extension library used to read files
      stored inside zip files. The API is very similar to the standard
      Lua I/O library API.
   ]],
   homepage = "http://github.com/rjpcomputing/luazip",
   license = "MIT"
}
dependencies = {
   "lua >= 5.1"
}
external_dependencies = {
   ZZIP = {
      header = "zzip.h"
   }
}
build = {
   type = "builtin",
   modules = {
      zip = {
         incdirs = {
            "$(ZZIP_INCDIR)"
         },
         libdirs = {
            "$(ZZIP_LIBDIR)"
         },
         libraries = {
            "zzip"
         },
         sources = "src/luazip.c"
      }
   }
}
