# Brendan Gray — Portfolio

A static, framework-free portfolio site. Plain HTML, CSS and ES modules; no build step.

## Run locally

Any static server that falls back to `index.html` for unknown paths works. For example:

```bash
npx -y serve -s .          # or: python3 -m http.server 4173 (deep links need the fallback below)
```

## Deploy

The site is host-agnostic. Upload the folder (or connect the repo) to any static host and point the custom domain at it:

- **Cloudflare Pages / Netlify** — `_redirects` already routes every path to `index.html`.
- **Vercel** — `vercel.json` does the same.
- **GitHub Pages** — `404.html` is a copy of `index.html`, which makes deep links resolve. Keep it in sync if `index.html` changes.

## Structure

```
index.html            shell: nav, <main>, morph layer
css/tokens.css        palette, type scale, spacing, spring easings
css/base.css          reset, @font-face, typography rules, focus
css/components.css    nav, buttons, glass bubbles, figures, pager
css/pages.css         stage, detail and about layouts + responsive
css/motion.css        intro overlay, reduced-motion overrides
js/data.js            all copy and project metadata (edit content here)
js/router.js          history routing and page lifecycle
js/transitions.js     circle→rectangle morph, staggered page choreography
js/glass.js           WebGL lens shader for the glass bubbles (CSS fallback)
js/gravity.js         leashed-gravity pointer field (from Wellspring Group)
js/intro.js           "Hey, I'm Brendan Gray" opening beat (once per session)
js/pages/*.js         projects / fun zone stage, detail, about
js/tuner.js           vanilla DialKit (dev only, loaded with ?tune)
js/tune.js            the glass-bubble DialKit config
assets/               fonts, optimised images, resume PDF
```

## Debug flags

- `/?intro` — replay the intro beat
- `/?rm` — force reduced-motion behaviour
- `/?nogl` — force the CSS glass fallback
- `/?tune` — open the DialKit panel for the glass bubbles (lens, rim, light, layout, gravity, hover spring, shadow). "Copy config" puts a JSON block on the clipboard; paste its values over `GLASS_DEFAULTS` in `js/glass.js`, `STAGE_DEFAULTS` in `js/pages/stage.js`, and the `--bubble-*` / `--spring-bouncy` tokens in `css/tokens.css` to bake a look in. Values persist in localStorage until Reset.
