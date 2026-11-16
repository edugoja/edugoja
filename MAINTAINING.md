# Maintaining this repo

This is a GitHub **profile repository**: because it is named `edugoja/edugoja`,
GitHub shows `README.md` at the top of <https://github.com/edugoja>.
Those docs live here rather than in `README.md` so they don't appear on the
public profile.

## What's in it

| File | Purpose |
| --- | --- |
| `README.md` | The profile page itself. |
| `edugoja-github-stats.svg` | Stats card (commit count, top languages) embedded in the README. Regenerated daily. |
| `stats/` | Node script that generates the stats card from the GitHub GraphQL API. |
| `.github/workflows/stats.yml` | Daily workflow that regenerates and commits the stats card. |
| `.markdownlint.jsonc` | Lint rules for the README. |

The only code is the stats generator in `stats/`. There is no build step or test suite.

## Setup

Requirements:

- Git
- Node.js 18+ (only for linting; nothing is installed into the repo)
- Optional: `xmllint` (from libxml2) to check the SVG

```sh
git clone https://github.com/edugoja/edugoja.git
cd edugoja
```

## Running locally

Preview the README with any Markdown viewer that renders inline HTML, for
example VS Code's Markdown preview or [`grip`](https://github.com/joeyespo/grip):

```sh
grip README.md   # serves a GitHub-style preview at http://localhost:6419
```

Lint and validate before pushing:

```sh
npx markdownlint-cli2 README.md MAINTAINING.md
xmllint --noout edugoja-github-stats.svg
```

### Updating the stats card

The `Update stats card` workflow regenerates `edugoja-github-stats.svg` every
day at 00:00 UTC and commits it if it changed. To refresh it now, run the
workflow from the Actions tab. To generate it locally:

```sh
npm ci --prefix stats
GITHUB_API_TOKEN=<token> node stats/generate-stats.js edugoja
```

GitHub caches images through its camo proxy, so a change can take a while to
show. Renaming the file and updating the README path forces a refresh.

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `GITHUB_API_TOKEN` | Local shell or `.env` (git-ignored) | GitHub token used by `stats/generate-stats.js`. |
| `GH_TOKEN` | Repository secret | Passed to the workflow as `GITHUB_API_TOKEN`. Use a token that can read your private contributions. |

## Deployment

There is no deploy step. Merging to `main` publishes the change: GitHub
renders `README.md` on the profile as soon as `main` updates.

1. Open a pull request with the change.
2. Check the rendered `README.md` in the PR's "Files changed" view.
3. Merge to `main`.
4. Check <https://github.com/edugoja>, and hard-refresh if images look stale.
