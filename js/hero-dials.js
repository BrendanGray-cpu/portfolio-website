/* ─────────────────────────────────────────────────────────
 * HERO HEAD DIALS  (home page, only with ?hero-dials)
 *
 *   Box        the #view box the canvas fills: width, height (vh, capped by max), min height,
 *              and how wide the head's grid column is next to the copy
 *   Position   nudge the whole head + mood pill (x, y) and its sticky top offset
 *   Framing    the camera inside the box: distance (zoom), fov, offsetX/Y (pan), crop (neck cut)
 *   showBounds outlines the box so you can see what's clipping
 *
 * Box and Position drive CSS variables (--head-*) in site.css. Framing goes to head.js
 * through its existing postMessage({ type: 'head-params' }) override.
 * Tweaks persist in localStorage; "Copy parameters" puts them on the clipboard.
 * ───────────────────────────────────────────────────────── */
if (new URLSearchParams(location.search).has('hero-dials')) {
  const KEY = 'hero-dials.v1';
  const { dialDrag } = await import('/js/dial-drag.js');
  dialDrag('hero-dials.pos');
  const file = await fetch('/assets/data/hero-params.json').then(r => r.json()).catch(() => ({}));
  const cam = { distance: 5.9, fov: 29, offsetX: 0, offsetY: -0.02, crop: -1.21, ...(file.camera || {}) };

  const CONFIG = {
    box: {
      width: [118, 60, 160, 1],        // % of the column
      heightVh: [70, 30, 95, 1],       // vh
      maxHeight: [620, 300, 1100, 10], // px
      minHeight: [380, 200, 800, 10],  // px
      column: [1, 0.5, 2, 0.05],       // fr, copy column is 1fr
    },
    position: {
      x: [0, -300, 300, 1],
      y: [14, -300, 300, 1],
      stickyTop: [80, 0, 240, 2],
    },
    framing: {
      distance: [cam.distance, 2, 12, 0.05],
      fov: [cam.fov, 10, 70, 1],
      offsetX: [cam.offsetX, -1, 1, 0.01],
      offsetY: [cam.offsetY, -1, 1, 0.01],
      crop: [cam.crop, -1.5, -0.3, 0.01],
    },
    showBounds: false,
    reset: { type: 'action', label: 'Reset to current site values' },
  };
  const DEFAULTS = {
    box: Object.fromEntries(Object.entries(CONFIG.box).map(([k, v]) => [k, v[0]])),
    position: Object.fromEntries(Object.entries(CONFIG.position).map(([k, v]) => [k, v[0]])),
    framing: Object.fromEntries(Object.entries(CONFIG.framing).map(([k, v]) => [k, v[0]])),
    showBounds: false,
  };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const mergeV = (a, b) => ({ box: { ...a.box, ...(b.box || {}) }, position: { ...a.position, ...(b.position || {}) }, framing: { ...a.framing, ...(b.framing || {}) }, showBounds: b.showBounds ?? a.showBounds });
  let V = mergeV(DEFAULTS, load());

  const root = document.documentElement.style, view = document.getElementById('view');
  const sendCamera = () => window.postMessage({ type: 'head-params', params: { camera: { ...V.framing } } }, location.origin);
  const apply = () => {
    const b = V.box, p = V.position;
    root.setProperty('--head-w', b.width + '%');
    root.setProperty('--head-vh', b.heightVh + 'vh');
    root.setProperty('--head-max', b.maxHeight + 'px');
    root.setProperty('--head-min', b.minHeight + 'px');
    root.setProperty('--head-col', b.column + 'fr');
    root.setProperty('--head-x', p.x + 'px');
    root.setProperty('--head-y', p.y + 'px');
    root.setProperty('--head-top', p.stickyTop + 'px');
    view.style.outline = V.showBounds ? '1px dashed #2f5bff' : '';
    view.style.outlineOffset = '-1px';
    dispatchEvent(new Event('resize'));   // head.js sizes its canvas on window resize
    sendCamera();
  };
  // head.js loads its point data before it listens; resend once it says it's ready
  addEventListener('message', (e) => { if (e.data?.type === 'head-ready') sendCamera(); });

  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/vendor/dialkit/styles.css'; document.head.appendChild(css);
  const s = document.createElement('script'); s.src = '/vendor/dialkit/browser.global.js';
  s.onload = () => {
    DialKit.createDialRoot({ theme: 'light' });
    const dials = DialKit.createDialKit('Hero head', CONFIG, {
      onAction: (a) => { if (a === 'reset') { V = mergeV(DEFAULTS, {}); dials.setValues(V); apply(); } },
    });
    dials.setValues(V);
    dials.subscribe((v) => {
      V = mergeV(V, v);
      try { localStorage.setItem(KEY, JSON.stringify(V)); } catch {}
      apply();
    }, false);
    apply();
  };
  document.head.appendChild(s);
}
