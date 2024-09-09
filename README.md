## A package repository for [Mudlet](https://www.mudlet.org) ##

This Github repository hosts packages made for the Mudlet MUD client.  It is also home to the development of **mpkg**, a command line interface for managing packages used in [Mudlet](https://www.mudlet.org) which helps you install, remove, search the repository and update packages from the Mudlet command line.

### Installation ###

To get started, install the `mpkg` client in Mudlet by issuing;

```lua installPackage("https://mudlet.github.io/mudlet-package-repository/packages/mpkg.mpackage")```

Then on the command line you can issue any of the following commands.

```
Commands:
  mpkg help             -- show this help
  mpkg install          -- install a new package
  mpkg list             -- list all installed packages  
  mpkg remove           -- remove an existing package
  mpkg search           -- search for a package via name and description
  mpkg show             -- show detailed information about a package
  mpkg update           -- update your package listing
  mpkg upgradeable      -- show packages that can be upgraded
  mpkg debug            -- turn on debugging messages
```

### Submit a Package ###

Have you created a package you wish to share?  There are currently three methods to get your package added to this repository.

#### via Web Browser ####

- navigate to the [packages sub directory](https://github.com/Mudlet/mudlet-package-repository/upload/main/packages) in the package repository, then follow the file upload prompts to add your mpackage.

####  via Traditional Github Method ####

Contribute your mpackage using Github's "[fork and pull request](https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project)" method
- create a fork and clone the repository, 
- copy your mpackage to the cloned repository subdirectory `packages/` (no further files need to be changed, Github workflows take care of rebuilding the repository index),
- commit, push and submit a pull request.

#### via The Repository Maintainer ####

If you are having trouble submitting via Github, or do not yet have an account (and we really suggest you do to help support Mudlet!), you can contact Zooka on [Mudlet's Discord server](https://discordapp.com/invite/kuYvMQ9) and he will assist in getting your package submitted.

### Report Issues ###

Report any [issues here](https://github.com/Mudlet/mudlet-package-repository/issues) or find us on [Mudlet's Discord server](https://discordapp.com/invite/kuYvMQ9).

