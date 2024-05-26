## A package repository for [Mudlet](https://www.mudlet.org) ##

### Installation ###

**mpkg** is a command line interface for managing packages used in [Mudlet](https://www.mudlet.org).  
You can install, remove, search the repository and update packages using this interface.

To get started install the mpkg client in Mudlet by issuing;

```lua installPackage("https://zookaongit.github.io/mudlet-package-repository/mpkg.mpackage")```

then type

```mpkg update```

to get a repository info.

```
Commands:
  mpkg help             -- show this help
  mpkg install          -- install a new package
  mpkg list             -- list all installed packages  
  mpkg remove           -- remove an existing package
  mpkg search           -- search for a package via name and description
  mpkg show             -- show detailed information about a package
  mpkg update           -- update your package listing
  mpkg debug            -- turn on debugging messages
```

### Submit a Package ###

Have you created a package you wish to share?  Submit a [pull request](https://github.com/ZookaOnGit/mudlet-package-repository/pulls)
to have it included in the mudlet package repository.
