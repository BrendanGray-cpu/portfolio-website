# Brendan Gray — Portfolio

A static, framework-free portfolio site. Plain HTML, CSS and ES modules; no build step.

## Run locally

Any static server that falls back to `index.html` for unknown paths works. For example:

```bash
npx -y serve -s .          # or: python3 -m http.server 4173 (deep links need the fallback below)
```

## Deploy

The site is host-agnostic. Upload the folder (or connect the repo) to any static host and point the custom domain at it:

- **Cloudflare Workers (static assets)** — `wrangler.jsonc` serves the folder with single-page-app fallback, and `.assetsignore` keeps `.git` and config files out of the upload. Deploy command: `npx wrangler deploy`.
- **Vercel** — `vercel.json` rewrites every path to `index.html`.
- **GitHub Pages** — `404.html` is a copy of `index.html`, which makes deep links resolve. Keep it in sync if `index.html` changes.
- **Netlify** — add a `_redirects` file containing `/* /index.html 200` (not committed, because Cloudflare rejects that rule).

## Structure

```
index.html            shell: nav, <main>, morph layer
css/tokens.css        palette, type scale, spacing, spring easings
css/base.css          reset, @font-face, typography rules, focus
css/components.css    nav, buttons, project cards, lightbox, figures, pager
css/pages.css         stage, detail and about layouts + responsive
css/motion.css        intro overlay, reduced-motion overrides
js/data.js            all copy and project metadata (edit content here)
js/router.js          history routing and page lifecycle
js/transitions.js     thumbnail→hero morph, staggered page choreography
js/intro.js           "Hey, I'm Brendan Gray" opening beat (once per session)
js/pages/*.js         projects / fun zone stage, detail, about
assets/               fonts, optimised images, resume PDF
```

## Debug flags

- `/?intro` — replay the intro beat
- `/?rm` — force reduced-motion behaviour
