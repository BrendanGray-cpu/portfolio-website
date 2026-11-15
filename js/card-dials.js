/* ─────────────────────────────────────────────────────────
 * FOLDER CARD DIALS  (Home, only with ?card-lab)
 *
 *   front      height of the front pocket (% of the folder)
 *   leadRise   how far the first screenshot lifts on hover (% of its height)
 *   fanX/fanY  how far the other screenshots fan out sideways / up (% of their size)
 *   fanTilt    their rotation when fanned
 *   duration   the fan transition
 *   touchDelay phones: wait after the folder is on screen before fanning out
 *
 * Tweaks persist in localStorage; DialKit's "Copy parameters" puts them on the clipboard.
 * Bake them into the --folder-* defaults in the folder card block of css/site.css.
 * ───────────────────────────────────────────────────────── */
if (new URLSearchParams(location.search).has('card-lab')) {
  const KEY = 'folder-dials.v1';
  const CONFIG = {
    front: [40, 20, 70, 1],
    leadRise: [6, 0, 40, 1],
    fanX: [16, 0, 70, 1],
    fanY: [36, 0, 60, 1],
    fanTilt: [7, 0, 20, 0.5],
    duration: [520, 150, 1200, 10],
    touchDelay: [500, 0, 3000, 50],
    open: { type: 'action', label: 'Open / close all three' },
  };
  const UNIT = { front: '%', leadRise: '%', fanX: '%', fanY: '%', fanTilt: 'deg', duration: 'ms', touchDelay: '' };
  const VARS = { front: '--folder-front', leadRise: '--folder-lead-rise', fanX: '--folder-fan-x', fanY: '--folder-fan-y', fanTilt: '--folder-fan-tilt', duration: '--folder-dur', touchDelay: '--folder-touch-delay' };
  const defaults = Object.fromEntries(Object.entries(CONFIG).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v[0]]));
  let V = { ...defaults, ...(() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })() };
  const rootStyle = document.documentElement.style;
  const apply = () => { for (const k in VARS) rootStyle.setProperty(VARS[k], V[k] + UNIT[k]); };
  const cards = () => [...document.querySelectorAll('[data-folder]')];

  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/vendor/dialkit/styles.css'; document.head.appendChild(css);
  const s = document.createElement('script'); s.src = '/vendor/dialkit/browser.global.js';
  s.onload = () => {
    DialKit.createDialRoot({ theme: 'light' });
    const dials = DialKit.createDialKit('Folder cards', CONFIG, {
      onAction: (a) => { if (a === 'open') { const on = !cards()[0]?.classList.contains('open'); cards().forEach(c => c.classList.toggle('open', on)); } },
    });
    dials.setValues(V);
    dials.subscribe((v) => { V = { ...V, ...Object.fromEntries(Object.keys(defaults).filter(k => k in v).map(k => [k, v[k]])) }; try { localStorage.setItem(KEY, JSON.stringify(V)); } catch {} apply(); }, false);
    apply();
    document.querySelector('.featured')?.scrollIntoView({ block: 'start' });
  };
  document.head.appendChild(s);
}
