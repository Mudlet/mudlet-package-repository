# Trusted publishing

A package's own GitHub Actions workflow can publish new versions to this
repository without anyone storing a token anywhere.

Instead of a personal access token, the workflow asks GitHub for a short-lived
OIDC token describing that particular run — which repository, which workflow
file, which commit — and sends it to `https://packages.mudlet.org/api/publish`.
The site verifies the token against GitHub's public keys, checks the run against
[`trusted-publishers.json`](trusted-publishers.json), and opens the same kind of
pull request the upload form does.

Nothing about review changes. A trusted publish still lands as a pull request,
still runs `Validate mpackage file`, and still needs whatever the auto-merge
workflow requires. Trusted publishing changes who may *ask* for a package to be
updated, never what is allowed to land.

## For package authors

### 1. Ask a maintainer to register your workflow

Open a pull request adding an entry to `trusted-publishers.json`:

```json
{
  "mpackage": "yourpackage",
  "filename": "yourpackage.mpackage",
  "repository": "you/yourrepo",
  "repositoryId": "80291515",
  "repositoryOwnerId": "1749428",
  "workflow": ".github/workflows/publish.yml"
}
```

Get the two ids with:

```sh
curl -s https://api.github.com/repos/OWNER/REPO | jq '.id, .owner.id'
```

They are matched instead of the repository name because names move: a
repository can be renamed, transferred, or deleted and recreated by somebody
else, and every one of those leaves the old `owner/repo` string pointing
somewhere new. The numeric ids do not move.

Two optional keys tighten things further:

| Key | Effect |
| --- | --- |
| `ref` | Only publish from this exact ref, e.g. `refs/heads/main`. |
| `environment` | Only publish from a job in this GitHub environment. Give the environment required reviewers and a publish needs a human to approve it. |
| `allowSelfHostedRunner` | Permit self-hosted runners. Off by default — they are outside GitHub's control. |

### 2. Publish from your workflow

Attach the `.mpackage` to a GitHub release, then:

```yaml
name: Publish to Mudlet package repository

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write     # required: lets the job mint an OIDC token
      contents: read
    steps:
      - name: Publish
        uses: actions/github-script@v7
        with:
          script: |
            const token = await core.getIDToken('https://packages.mudlet.org')
            const asset = context.payload.release.assets
              .find(a => a.name.endsWith('.mpackage'))
            if (!asset) throw new Error('no .mpackage asset on this release')

            const response = await fetch('https://packages.mudlet.org/api/publish', {
              method: 'POST',
              headers: {
                authorization: `Bearer ${token}`,
                'content-type': 'application/json',
              },
              body: JSON.stringify({ artifactUrl: asset.browser_download_url }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
            core.notice(`Opened ${result.pullRequest}`)
```

`permissions: id-token: write` is what allows `core.getIDToken`. Without it the
step fails with "Unable to get ACTIONS_ID_TOKEN_REQUEST_URL".

The artifact is passed as a URL rather than uploaded, so a large package does
not run into the request body limits on the site, and the URL must be a release
asset of the same repository the token was issued to.

One workflow may publish several packages: give each its own entry, all naming
the same `workflow`. Which entry a run is acting under is decided by the
`mpackage` in the `config.lua` it uploads.

### Reusable workflows are not supported

The registry pins `job_workflow_ref`, which names the workflow file that
actually contains the running job. If you move the publish step into a reusable
workflow, that claim names the reusable workflow instead of yours and the
request is refused. Keep the publishing job in your own workflow file.

This is deliberate: pinning only the repository would let *any* workflow anyone
lands in it publish, and a pull request is often enough to add one.

## For maintainers

Adding an entry to `trusted-publishers.json` is what grants publish rights, so
review it like a credential. Worth checking:

- **The ids are right.** Fetch them yourself rather than trusting the diff.
- **The workflow path is the one they described**, and lives in the repository
  the ids point at — spelled exactly as the file is. The match is
  case-sensitive, so a run from `Publish.yml` does not satisfy an entry for
  `publish.yml`.
- **The person asking controls that repository.** The registry cannot tell.
- **The package is theirs.** An entry for a package someone else already
  publishes is refused at publish time (the author in `config.lua` must match
  the index), but it should not get that far.
- **The `filename` is theirs too.** It is the path the archive lands on, and
  nothing about the rest of the entry constrains it: an entry that names another
  package's file would publish over that file. `validate-trusted-publishers.yml`
  rejects one that collides with another entry or with a published package, and
  the endpoint refuses it as well, but the diff is where it is obvious.

`trusted-publishers.json` is outside `packages/`, so the auto-merge workflow —
which only ever touches `packages/*.mpackage` and `packages/*.zip` — will not
merge a change to it.

## Provenance, and why the badge is not driven by this file

A package published this way gets a "Published from source by CI" panel on its
page, linking the repository, the workflow file and the commit the run was on.

The panel says *published*, not *built*, because that is what the record can
support: a release asset can be attached to a release by hand. What is proven is
that these exact bytes were submitted by that run, from that repository, by that
workflow file. A run on a tag is pinned further — the asset must belong to that
tag's own release — but a run on a branch can offer any asset the repository
has.

That panel is deliberately **not** driven by `trusted-publishers.json`. This
file records an intention, decided before any archive exists — it cannot say how
the file currently sitting in `packages/` got there. A registered package can
still be replaced by a website upload, an ordinary fork-and-pull-request, or a
maintainer committing directly, and a badge reading the registry would go on
vouching for the origin of a file nobody checked.

So the publish endpoint writes a record under `provenance/`, one file per
package — `provenance/arkadia.mpackage.json` for `packages/arkadia.mpackage` —
holding the archive's **sha-256** alongside the repository, workflow, commit and
run that produced it. The site hashes the archive it is actually serving and
shows the panel only if it matches. Replace those bytes by any route and the
record stops describing the file, so the badge disappears on its own. It fails
closed, and nobody has to remember to revoke anything.

One file per package rather than one shared registry, because a shared file does
not survive concurrent use: two packages publishing at the same time would be
editing it on two branches cut from the same commit, and whichever merged second
would land in conflict — which auto-merge declines to touch, so both would sit
there until someone rebased them by hand. Sharded, two publishes never write the
same path.

This is why a trusted publish changes two files. Those records are what the
badge trusts, so they are kept out of reach of anything else:

- `validate-mpackage.yml` allows the record *for that package* to accompany it —
  `provenance/<the file in packages/>.json`, named exactly — and still rejects
  any other extra file, and still allows only one package per pull request.
- `auto-merge-packages.yml` allows one in scope **only** when the pull request
  comes from a `trusted-publish/*` branch in this repository, opened by the
  machine account — and then only the record belonging to the package in that
  same pull request. Only the site can create a branch here, so a pull request
  from a fork can never meet that condition.

A maintainer merging a hand-made pull request that touches anything under
`provenance/` should treat it exactly like a change to `trusted-publishers.json`.

### Renaming a package's file needs a manual merge

If the `filename` in a publisher's entry changes, the next publish deletes the
old archive and its record as well as adding the new pair. Auto-merge only
accepts files with status `added` or `modified`, so a pull request containing
those deletions will pass validation and then wait for a maintainer.

That is the pre-existing rule and it applies to a rename through the upload form
too. It is left alone deliberately: renames are rare — they only happen when a
maintainer edits the registry — and teaching the auto-merge gate to accept
deletions is a wider change to what can land unattended than the case justifies.

## What the endpoint checks

In order, and the request stops at the first failure:

1. The token is signed by `https://token.actions.githubusercontent.com`, has
   audience `https://packages.mudlet.org`, and is under 15 minutes old.
2. `repository_id` and `repository_owner_id` match at least one registry entry.
3. `job_workflow_ref` names the registered workflow file, character for
   character. What is left is every entry that workflow may publish.
4. `artifactUrl` is an HTTPS release asset of the repository in the token — and
   of that tag's own release, when the run is on a tag.
5. The archive holds a `config.lua` with all six required fields.
6. `config.lua`'s `mpackage` picks one of those entries. That is the publisher.
7. `ref`, `environment` and runner type match, where **that entry** constrains
   them.
8. `packages/<filename>` is not already some other package's file.
9. If the package is already in the index, its author matches.

It then opens a pull request adding the archive and recording its digest under
`provenance/`.

A token is accepted once, and a workflow run gets one pull request. Calling
twice from one run — a retry whose first reply was lost, say — answers `409`:
with the earlier pull request in the same `pullRequest` field a success returns,
when that call got far enough to open one, and with `This token has already been
used` when the retry re-sent the very same token.

The audience pin means a token minted for some other service cannot be
forwarded here, and a token minted for us is useless anywhere else.
