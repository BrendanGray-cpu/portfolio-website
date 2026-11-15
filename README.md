# Brendan Gray, Portfolio

Static, framework-free site: plain HTML, CSS and ES modules. The HTML pages are generated from `content/*.md` by `tools/build.py` and committed, so there's no build step on deploy.

## Edit and build

```bash
python3 tools/build.py   # rebuilds index.html, work/*.html, fun-zone.html, about.html
python3 serve.py         # no-cache server on http://localhost:8028
```

## Deploy

Cloudflare Workers static assets: `wrangler.jsonc` serves the folder, `.assetsignore` keeps source (`content/`, `tools/`) and config out of the upload. Pushing to `main` deploys.

## Labs

Hidden tuning panels on the live page: `/?intro-lab` (home intro), `/?type-lab` (word hover effects), `/?dials` (recommendation spacing). `/?intro` forces the intro to play.

The previous site lives on the `portfolio-2025` branch.
