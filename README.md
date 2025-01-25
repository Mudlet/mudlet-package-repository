## A Package Repository for [Mudlet](https://www.mudlet.org) ##

This Github repository hosts packages made for the Mudlet MUD client.  It is also home to the development of **mpkg**, a command line interface for managing packages used in [Mudlet](https://www.mudlet.org) which helps you install, remove, search and update packages from the Mudlet command line.

### Installation ###

mpkg comes preinstalled on later (4.20+) versions of Mudlet.  If you do not have it, consider upgrading or
issue this command on any profile you wish to use mpkg with.

```lua installPackage("https://github.com/Mudlet/mudlet-package-repository/raw/refs/heads/main/packages/mpkg.mpackage")```

Then on the command line you can issue any of the following commands.

```
Commands:
  mpkg install          -- install/upgrade a package
  mpkg list             -- list all installed packages
  mpkg remove           -- remove an existing package
  mpkg search           -- search for a package
  mpkg show             -- show detailed information about a package
  mpkg update           -- update package listing from repository
```

### Submit a Package ###

Have you created a package you wish to share?  There are two methods to get your package added to this repository.

### via the Package Website ###

Visit the main package website (https://packages.mudlet.org) and follow the links to upload.

####  via Github Method ####

Contribute your mpackage using Github's "[fork and pull request](https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project)" method
- create a fork and clone the repository, 
- copy your mpackage to the cloned repository subdirectory `packages/` (no further files need to be changed, Github workflows take care of rebuilding the repository index),
- commit, push and submit a pull request.

### Development ###

Using Docker, run `./mpkg/muddle` or run Muddler [manually](https://github.com/demonnic/muddler/wiki/Installation) to generate the new `./mpkg/build/mpkg.mpackage` file can be loaded into Mudlet as a module.

### New `mpkg` release

To make a new mpkg release, bump the version in [mpkg/mfile](mpkg/mfile) and the rest will happen automatically.

### Report Issues ###

Report any [issues here](https://github.com/Mudlet/mudlet-package-repository/issues) or find us on [Mudlet's Discord server](https://discordapp.com/invite/kuYvMQ9).

