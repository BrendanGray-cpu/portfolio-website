/* ─────────────────────────────────────────────────────────
 * INTRO LAB (Home with ?intro-lab)
 *
 * Scrub, replay and tune the intro on the real page. Tweaks persist in this
 * browser; DialKit's "Copy parameters" gives JSON for /assets/data/intro-params.json.
 * ───────────────────────────────────────────────────────── */
import { DEFAULTS, schedule } from './intro.js';

if (new URLSearchParams(location.search).has('intro-lab')) {
  const KEY = 'intro-lab.v1';
  const st = (s) => ({ on: s.on, dur: [s.dur, 0, 3000, 10] });
  const CONFIG = {
    scrub: [0, 0, 12, 0.01],
    play: { type: 'action', label: 'Replay' },
    skip: { type: 'action', label: 'Skip to the end' },
    speed: [DEFAULTS.speed, 0.25, 2, 0.05],
    stages: Object.fromEntries(Object.entries(DEFAULTS.stages).map(([k, v]) => [k, st(v)])),
    overlap: [DEFAULTS.overlap, 0, 500, 10],
    look: {
      scans: DEFAULTS.look.scans, ink: DEFAULTS.look.ink, accent: DEFAULTS.look.accent, guide: DEFAULTS.look.guide,
      weight: [DEFAULTS.look.weight, 0.5, 4, 0.1], detail: [DEFAULTS.look.detail, 0, 1, 0.05],
      wobble: [DEFAULTS.look.wobble, 0, 30, 0.5], grid: DEFAULTS.look.grid, gridAlpha: [DEFAULTS.look.gridAlpha, 0, 1, 0.01],
      boxModelAlpha: [DEFAULTS.look.boxModelAlpha, 0, 0.6, 0.01], columnAlpha: [DEFAULTS.look.columnAlpha, 0, 0.3, 0.01],
    },
    copy: Object.fromEntries(Object.entries(DEFAULTS.copy).filter(([, v]) => typeof v === 'string')),   // lists (brief, diff) are edited in intro-params.json
  };
  const strip = ({ scrub, play, skip, ...rest }) => rest;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };

  const go = (intro) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/vendor/dialkit/styles.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = '/vendor/dialkit/browser.global.js';
    s.onload = () => {
      DialKit.createDialRoot({ theme: 'light' });
      const dials = DialKit.createDialKit('Intro lab', CONFIG, {
        onAction: (a) => {
          if (a === 'play') { intro.setParams(params()); intro.play(); }
          if (a === 'skip') intro.seek(schedule(params()).total);
        },
      });
      let V = null;
      const params = () => { const v = strip(V || {}); return { ...DEFAULTS, ...v, look: { ...DEFAULTS.look, ...(v.look || {}) }, copy: { ...DEFAULTS.copy, ...(v.copy || {}) }, stages: Object.fromEntries(Object.keys(DEFAULTS.stages).map((k) => [k, { ...DEFAULTS.stages[k], ...((v.stages || {})[k] || {}) }])) }; };
      const saved = load(); if (saved) dials.setValues(saved);
      let lastScrub = null;
      dials.subscribe((v) => {
        V = v; try { localStorage.setItem(KEY, JSON.stringify(strip(v))); } catch {}
        intro.setParams(params());
        if (v.scrub !== lastScrub && lastScrub !== null) intro.seek(Math.min(v.scrub, schedule(params()).total));
        else if (!intro.state.playing) intro.seek(intro.state.t);
        lastScrub = v.scrub;
      }, true);
      intro.state.onEnd = () => {};
    };
    document.head.appendChild(s);
  };
  if (window.__intro) go(window.__intro); else addEventListener('intro:ready', () => go(window.__intro), { once: true });
}
