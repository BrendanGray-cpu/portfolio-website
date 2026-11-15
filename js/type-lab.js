/* ─────────────────────────────────────────────────────────
 * TYPE LAB (Home with ?type-lab)
 *
 * A variation per word, then dials for each chosen effect. Saved in this browser;
 * DialKit's "Copy parameters" gives JSON for /assets/data/type-params.json.
 * ───────────────────────────────────────────────────────── */
if (new URLSearchParams(location.search).has('type-lab')) {
  const KEY = 'type-lab.v3';
  const { VARIANTS, DEFAULTS, mergeParams } = await import('./type-play.js');
  const D = DEFAULTS;
  const LABELS = { builder: 'Product builder', designer: 'Product designer', graphic: 'Graphic design', pm: 'Product management', code: 'Code', grow: 'Grow', scale: 'Scale', obvious: 'Obvious', ai: 'AI', learn: 'Learn', explore: 'Explore' };
  const CONFIG = {
    hint: { type: 'select', options: ['none', 'dotted', 'tint'], default: D.hint },
    speed: [D.speed, 0.25, 2, 0.05],
    pick: Object.fromEntries(Object.entries(VARIANTS).map(([k, v]) => [k, { type: 'select', options: [...v, 'off'], default: D.pick[k], label: LABELS[k] }])),
    toolbelt: { gap: [D.toolbelt.gap, 24, 60, 1], iconSize: [D.toolbelt.iconSize, 0.6, 1.6, 0.05], offsetY: [D.toolbelt.offsetY, 10, 80, 1], arc: [D.toolbelt.arc, 0, 120, 1], stagger: [D.toolbelt.stagger, 0, 120, 5], pad: [D.toolbelt.pad, 10, 40, 1], inDur: [D.toolbelt.inDur, 150, 1000, 10], outDur: [D.toolbelt.outDur, 120, 800, 10] },
    selection: { label: D.selection.label, pad: [D.selection.pad, 0, 16, 1], showSize: D.selection.showSize },
    misreg: { offset: [D.misreg.offset, 1, 10, 0.5], marks: [D.misreg.marks, 4, 24, 1] },
    ticket: { key: D.ticket.key, title: D.ticket.title, doneAt: [D.ticket.doneAt, 200, 2000, 10], width: [D.ticket.width, 220, 380, 2], offsetY: [D.ticket.offsetY, 0, 40, 1], inDur: [D.ticket.inDur, 120, 900, 10], outDur: [D.ticket.outDur, 100, 700, 10] },
    curve: { rise: [D.curve.rise, 0, 0.8, 0.01], grow: [D.curve.grow, 0, 0.6, 0.01], stagger: [D.curve.stagger, 0, 150, 5] },
    resize: { scale: [D.resize.scale, 1.05, 2, 0.01], dim: D.resize.dim },
    annotate: { weight: [D.annotate.weight, 1, 4, 0.1], pad: [D.annotate.pad, 4, 40, 1], arrow: [D.annotate.arrow, 30, 160, 1], drawDur: [D.annotate.drawDur, 150, 1200, 10] },
    ghost: { text: D.ghost.text },
    progress: { fillDur: [D.progress.fillDur, 200, 2000, 10], thickness: [D.progress.thickness, 2, 8, 0.5], label: D.progress.label, gap: [D.progress.gap, 4, 30, 1] },
    wander: { duration: [D.wander.duration, 800, 5000, 50], reach: [D.wander.reach, 0.4, 1.8, 0.05] },
  };
  const go = () => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/vendor/dialkit/styles.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = '/vendor/dialkit/browser.global.js';
    s.onload = () => {
      DialKit.createDialRoot({ theme: 'light' });
      const dials = DialKit.createDialKit('Type lab', CONFIG);
      try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved) dials.setValues(saved); } catch {}
      dials.subscribe((v) => {
        try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
        window.__typePlay.setParams(mergeParams(window.__typePlay.getParams(), v));
      }, true);
    };
    document.head.appendChild(s);
  };
  const wait = () => (window.__typePlay ? go() : setTimeout(wait, 100));
  wait();
}
