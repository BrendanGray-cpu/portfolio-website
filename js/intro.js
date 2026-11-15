/* ─────────────────────────────────────────────────────────
 * HOME INTRO: the hero gets built in front of you
 *
 * The overlay traces the real hero elements (their live bounding boxes), so every
 * stage sits exactly where the page will be, and the hand-off to the real DOM
 * doesn't jump. Stages run back to back; any that are switched off are skipped.
 *
 *   brief      a sticky note with three goals; each gets ticked, then it's set aside
 *   sketch     a first layout (head on the left) is scribbled out; the real one is drawn
 *   wireframe  scribbles settle into clean boxes on a 12-column grid; bars for text, an X for the head
 *   design     the name is set in Georgia, then swapped for Hanken Grotesk; the PM comments
 *              "Bigger name?" and the name scales up; the head box is resized; an eyedropper
 *              picks the blue and the selection turns blue; redlines show the real spacing
 *   code       DevTools box model over the intro; the comment becomes a diff; the build runs
 *              in a pill where the mood pill will appear
 *   live       the overlay clears, the head assembles, the mood pill takes the terminal's place
 *
 * Plays once per session on Home. Any click, key, wheel or touch skips to the end.
 * Reduced motion, narrow screens and a scrolled page get the finished hero.
 * Tune it at /?intro-lab (DialKit + a scrubber); paste "Copy parameters" into
 * /assets/data/intro-params.json.
 * ───────────────────────────────────────────────────────── */
import { makeKit, clamp, out, io, back, lerp } from './draw-kit.js';

export const DEFAULTS = {
  speed: 1,
  stages: {
    brief: { on: true, dur: 1000 },
    sketch: { on: true, dur: 2000 },
    wireframe: { on: true, dur: 800 },
    design: { on: true, dur: 1200 },
    code: { on: true, dur: 900 },
    live: { on: true, dur: 700 },
  },

  overlap: 80,                  // ms each stage starts before the previous one ends
  look: {
    ink: '#111111', accent: '#2f5bff', guide: '#2f5bff', paper: '#ffffff',
    weight: 1.5, detail: 0.4, wobble: 9, grid: true, gridAlpha: 0.22, columnAlpha: 0.05,
    scans: true,                // Brendan's scanned sketches and notes (assets/intro); off = drawn fallback
    boxModelAlpha: 0.16,
  },
  copy: {
    you: 'Brendan', other: 'PM', otherColor: '#8a8a86',
    briefTitle: 'The brief',
    brief: ['Show that I build, not just design', 'Made for hiring managers', 'Scannable in ten seconds'],
    comment: 'Bigger name?', commentDone: '✓ Resolved', autoLayout: 'Auto layout',
    diff: [{ kind: '', t: 'h1 {' }, { kind: '-', t: '  font-size: 96px;' }, { kind: '+', t: '  font-size: clamp(64px, 8.6vw, 124px);' }, { kind: '', t: '}' }],
    command: 'npm run build', building: 'building…', done: '✓ deployed',
  },
};
const ORDER = ['brief', 'sketch', 'wireframe', 'design', 'code', 'live'];
const KEY = 'intro-seen';
const MAX_MS = 12000;

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LAB = new URLSearchParams(location.search).has('intro-lab');
const FORCE = LAB || new URLSearchParams(location.search).has('intro');
const root = document.documentElement;

// ---------- schedule ----------
export function schedule(P) {
  const S = {}; let t = 0;
  for (const name of ORDER) {
    const st = P.stages[name];
    if (!st.on) { S[name] = null; continue; }
    const start = Math.max(0, t - (t ? P.overlap : 0));
    S[name] = { at: start / 1000, dur: st.dur / 1000 };
    t = start + st.dur;
  }
  S.total = Math.min(MAX_MS, t) / 1000;
  return S;
}
const prog = (S, name, t) => (S[name] ? clamp((t - S[name].at) / S[name].dur) : (stageDone(S, name, t) ? 1 : 0));
// a switched-off stage counts as done once the stage after it has started
function stageDone(S, name, t) {
  const i = ORDER.indexOf(name);
  for (let j = i + 1; j < ORDER.length; j++) if (S[ORDER[j]]) return t >= S[ORDER[j]].at;
  return t >= S.total;
}

// ---------- the parts of the hero the intro traces ----------
function collect() {
  const q = (s) => document.querySelector(s);
  const parts = [];
  const add = (el, kind, extra = {}) => { if (el) parts.push({ el, kind, ...extra }); };
  add(q('.nav'), 'nav');
  add(q('.nav .nav-dot'), 'navdot');
  add(q('.hero-title h1'), 'name', { lines: 2 });
  add(q('.hero-title .role'), 'text', { lines: 1 });
  document.querySelectorAll('.hero .intro p').forEach((p) => add(p, 'text', {}));
  add(q('.hero .intro .cta'), 'cta', { lines: 1 });
  add(q('#view'), 'head');
  add(q('#mood'), 'mood');
  return parts;
}
function measure(parts) {
  for (const p of parts) {
    const r = p.el.getBoundingClientRect();
    p.r = { x: r.left, y: r.top, w: r.width, h: r.height };
    if (p.kind === 'nav') {
      p.bars = [...p.el.querySelectorAll('a')].map((a) => {
        const range = document.createRange(); range.selectNodeContents(a); const tr = range.getBoundingClientRect();
        return { x: tr.left, y: tr.top + tr.height / 2 - 4, w: tr.width, h: 8 };
      });
    }
    if (p.kind === 'name') {
      const range = document.createRange(); range.selectNodeContents(p.el);
      p.textRight = Math.max(r.left + 40, ...[...range.getClientRects()].map((rc) => rc.right));
    }
    if (p.kind === 'text' || p.kind === 'name') {
      const cs = getComputedStyle(p.el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const n = p.lines || Math.max(1, Math.round(r.height / lh));
      const fs = parseFloat(cs.fontSize);
      // placeholder bars: one per line, x-height tall, last line shorter
      p.bars = Array.from({ length: n }, (_, i) => {
        const y = r.top + lh * i + (lh - fs * 0.55) / 2;
        const w = r.width * (i === n - 1 && n > 1 ? 0.55 + 0.25 * seeded(i + r.top) : 0.88 + 0.1 * seeded(i * 7 + r.left));
        return { x: r.left, y, w: Math.min(w, measureLine(p.el, i, n, r.width)), h: fs * 0.55 };
      });
    }
  }
}
// rough width of each rendered line, so bars match the real text's ragged edge
function measureLine(el, i, n, max) {
  const range = document.createRange(); range.selectNodeContents(el);
  const rects = [...range.getClientRects()].filter((rc) => rc.width > 2);
  const rows = [];
  for (const rc of rects) { const row = rows.find((r) => Math.abs(r.top - rc.top) < 4); if (row) { row.right = Math.max(row.right, rc.right); row.left = Math.min(row.left, rc.left); } else rows.push({ top: rc.top, left: rc.left, right: rc.right }); }
  rows.sort((a, b) => a.top - b.top);
  return rows[i] ? rows[i].right - rows[i].left : max;
}
const seeded = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

// wobbly hand-drawn rectangle: corners jittered, sides bowed, overshoot at the close
function sketchRect(r, amp, seed) {
  const j = (k) => (seeded(seed + k) - 0.5) * 2 * amp;
  const pts = [];
  const c = [[r.x + j(1), r.y + j(2)], [r.x + r.w + j(3), r.y + j(4)], [r.x + r.w + j(5), r.y + r.h + j(6)], [r.x + j(7), r.y + r.h + j(8)]];
  for (let s = 0; s < 4; s++) {
    const a = c[s], b = c[(s + 1) % 4];
    for (let i = 0; i <= 8; i++) { const f = i / 8, bow = Math.sin(f * Math.PI) * j(10 + s) * 0.6; const nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1; pts.push([lerp(a[0], b[0], f) + nx / L * bow, lerp(a[1], b[1], f) + ny / L * bow]); }
  }
  pts.push([c[0][0] + (c[1][0] - c[0][0]) * 0.12, c[0][1] + (c[1][1] - c[0][1]) * 0.12 + j(20) * 0.5]);
  return pts;
}
// a hand-drawn pill: the clean shape, nudged by a slow wobble along its length
function sketchPill(r, amp, seed) {
  const base = roundRectPts(r, r.h / 2, 120), p1 = seeded(seed) * 6.28, p2 = seeded(seed + 1) * 6.28;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  return base.map(([x, y], i) => { const f = i / 119, d = amp * 0.35 * (Math.sin(f * 9 + p1) + 0.6 * Math.sin(f * 17 + p2)); const dx = x - cx, dy = y - cy, L2 = Math.hypot(dx, dy) || 1; return [x + dx / L2 * d, y + dy / L2 * d]; });
}
function sketchOval(r, amp, seed) {
  const pts = [], cx = r.x + r.w / 2, cy = r.y + r.h / 2, rx = r.w * 0.34, ry = r.h * 0.4;
  const p1 = seeded(seed) * 6.28, p2 = seeded(seed + 1) * 6.28, f = amp / 100;   // smooth, low-frequency wobble
  for (let i = 0; i <= 64; i++) { const a = (i / 60) * Math.PI * 2 - 1.2; const k = 1 + f * (0.6 * Math.sin(a * 2 + p1) + 0.4 * Math.sin(a * 3 + p2)); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return pts;
}
// blend two point lists of equal length
const blend = (A, B, f) => A.map((p, i) => [lerp(p[0], B[i][0], f), lerp(p[1], B[i][1], f)]);
const pointAt = (pts, p) => { const i = Math.min(pts.length - 1, Math.max(0, Math.floor(p * (pts.length - 1)))); return pts[i]; };

// ---------- drawing helpers specific to the intro ----------
function pencil(c, x, y, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(-0.62); c.scale(1.5, 1.5);
  c.lineWidth = 1.2; c.strokeStyle = '#111'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(5, -12); c.lineTo(-5, -12); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(0, 0); c.lineTo(1.6, -4); c.lineTo(-1.6, -4); c.closePath(); c.fillStyle = '#111'; c.fill();
  c.beginPath(); c.rect(-5, -46, 10, 34); c.fillStyle = '#fff'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-5, -40); c.lineTo(5, -40); c.stroke();
  c.restore();
}
function figmaCursor(c, x, y, color, label, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x, y);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 17); c.lineTo(4.6, 12.6); c.lineTo(8, 19.4); c.lineTo(10.6, 18.2); c.lineTo(7.4, 11.6); c.lineTo(13.2, 11.6); c.closePath();
  c.fillStyle = color; c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#fff'; c.lineJoin = 'round'; c.stroke();
  c.font = '500 12px "Instrument Sans", ui-sans-serif, sans-serif'; const w = c.measureText(label).width + 14;
  c.beginPath(); c.roundRect(12, 18, w, 20, 999); c.fillStyle = color; c.fill();
  c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(label, 19, 28.5);
  c.restore();
}
function pill(c, x, y, text, bg, fg, a = 1, align = 'center') {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.font = '500 12px "Instrument Sans", ui-sans-serif, sans-serif';
  const w = c.measureText(text).width + 14, h = 20, x0 = align === 'center' ? x - w / 2 : x;
  c.beginPath(); c.roundRect(x0, y, w, h, 4); c.fillStyle = bg; c.fill();
  c.fillStyle = fg; c.textBaseline = 'middle'; c.fillText(text, x0 + 7, y + h / 2 + 0.5); c.restore();
}
function selection(c, r, color, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.strokeStyle = color; c.lineWidth = 1.2; c.strokeRect(r.x, r.y, r.w, r.h);
  const hs = 7;
  for (const [hx, hy] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h], [r.x + r.w / 2, r.y], [r.x + r.w / 2, r.y + r.h], [r.x, r.y + r.h / 2], [r.x + r.w, r.y + r.h / 2]]) {
    c.fillStyle = '#fff'; c.fillRect(hx - hs / 2, hy - hs / 2, hs, hs); c.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
  }
  c.restore();
}
function redline(c, x, y1, y2, color, a) {
  if (a <= 0 || y2 - y1 < 6) return;
  c.save(); c.globalAlpha = a; c.strokeStyle = color; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x, y1); c.lineTo(x, y2); c.moveTo(x - 4, y1); c.lineTo(x + 4, y1); c.moveTo(x - 4, y2); c.lineTo(x + 4, y2); c.stroke();
  c.restore();
  pill(c, x + 10, (y1 + y2) / 2 - 10, String(Math.round(y2 - y1)), color, '#fff', a, 'left');
}

// ---------- scans: his handwriting, revealed along its own pen paths ----------
// Made by tools/scans/process_scans.py: <name>.png is the ink (2x), <name>.json its ordered centerlines.
const SCAN_NAMES = ['brief', 'first', 'scribble', 'sketch', 'notes'];
// where the template's boxes sat at 1440 × 900; the scans are fitted from these to the live boxes
const TEMPLATE = { nav: [562, 16, 315, 44], name: [120, 176, 355, 188], role: [120, 435, 576, 33], para: [120, 564, 479, 336], head: [779, 179, 507, 507], mood: [961, 728, 142, 32] };
const BRIEF_BOXES = [[61, 249], [79, 428], [84, 635]];   // checkbox centers on the brief sheet
async function loadScans() {
  const out = {};
  await Promise.all(SCAN_NAMES.map(async (n) => {
    try {
      const [j, img] = await Promise.all([
        fetch(`/assets/intro/${n}.json`).then((r) => (r.ok ? r.json() : null)),
        new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `/assets/intro/${n}.png`; }),
      ]);
      if (!j || !img) return;
      let L = 0;
      const strokes = j.strokes.map((a) => { const s0 = L; for (let i = 2; i < a.length; i += 2) L += Math.hypot(a[i] - a[i - 2], a[i + 1] - a[i - 1]); const s1 = L; L += 16; return { a, s0, s1 }; });
      out[n] = { ...j, img, strokes, total: L };
    } catch {}
  }));
  return Object.keys(out).length ? out : null;
}
// least-squares fit of the template boxes to the live ones, per axis (identity at 1440 × 900)
function fitFrame(parts) {
  const get = (k) => parts.find((p) => p.kind === k);
  const texts = parts.filter((p) => p.kind === 'text');
  const live = { nav: get('nav')?.r, role: texts[0]?.r, para: texts[1]?.r, mood: get('mood')?.r,
    name: get('name') && { ...get('name').r, w: (get('name').textRight || get('name').r.x + get('name').r.w) - get('name').r.x },
    head: get('head') && inset(get('head').r, 0.06) };
  const X = [], Y = [];
  for (const k in TEMPLATE) {
    const t = TEMPLATE[k], r = live[k]; if (!r) continue;
    X.push([t[0], r.x], [t[0] + t[2], r.x + r.w]);
    Y.push([t[1], r.y]); if (k !== 'para') Y.push([t[1] + t[3], r.y + r.h]);
  }
  const fit = (P) => { const n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n; let num = 0, den = 0; for (const [a, b] of P) { num += (a - mx) * (b - my); den += (a - mx) ** 2; } const k = den ? num / den : 1; return [k, my - k * mx]; };
  const [ax, bx] = X.length > 1 ? fit(X) : [1, 0], [ay, by] = Y.length > 1 ? fit(Y) : [1, 0];
  return { x: bx, y: by, w: 1440 * ax, h: 900 * ay };
}
// draw a sheet revealed up to p (0..1 of its pen path) into the box (x, y, w, h) of the current transform
function reveal(state, c, sheet, p, x, y, w, h, alpha = 1) {
  if (!sheet || p <= 0 || alpha <= 0) return null;
  if (p >= 1) { c.save(); c.globalAlpha *= alpha; c.drawImage(sheet.img, x, y, w, h); c.restore(); return null; }
  const m = state.mctx, T = c.getTransform();
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, state.mask.width, state.mask.height);
  m.setTransform(T); m.translate(x, y); m.scale(w / sheet.w, h / sheet.h);
  m.lineCap = 'round'; m.lineJoin = 'round'; m.lineWidth = sheet.brush * 2.6; m.strokeStyle = '#000';
  const upto = p * sheet.total; let tip = null;
  m.beginPath();
  for (const s of sheet.strokes) {
    if (s.s0 >= upto) break;
    const a = s.a; let acc = s.s0;
    m.moveTo(a[0], a[1]); tip = [a[0], a[1]];
    for (let i = 2; i < a.length; i += 2) {
      const d = Math.hypot(a[i] - a[i - 2], a[i + 1] - a[i - 1]);
      if (acc + d > upto) { const f = (upto - acc) / d; tip = [a[i - 2] + (a[i] - a[i - 2]) * f, a[i - 1] + (a[i + 1] - a[i - 1]) * f]; m.lineTo(tip[0], tip[1]); break; }
      acc += d; m.lineTo(a[i], a[i + 1]); tip = [a[i], a[i + 1]];
    }
  }
  m.stroke();
  m.globalCompositeOperation = 'source-in'; m.drawImage(sheet.img, 0, 0, sheet.w, sheet.h); m.globalCompositeOperation = 'source-over';
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= alpha; c.drawImage(state.mask, 0, 0); c.restore();
  return tip ? [x + tip[0] * w / sheet.w, y + tip[1] * h / sheet.h] : null;
}
// a hand tick, pen-weight, for the brief's boxes
function tickPath(cx, cy, s, seed) {
  const j = (k) => (seeded(seed + k) - 0.5) * s * 0.12;
  return [[cx - s * 0.42 + j(1), cy - s * 0.02 + j(2)], [cx - s * 0.12 + j(3), cy + s * 0.32 + j(4)], [cx + s * 0.5 + j(5), cy - s * 0.55 + j(6)]];
}

// ---------- render one moment ----------
const win = (p, a, b) => clamp((p - a) / (b - a));      // progress through a window of a stage
const mirror = (r, hero) => ({ ...r, x: hero.x + hero.w - (r.x - hero.x) - r.w });

function sticky(c, k, x, y, w, h, rot, a, items, ticks, L, title) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x + w / 2, y + h / 2); c.rotate(rot); c.translate(-w / 2, -h / 2);
  k.plate(0, 0, w, h, 6); k.rect(0, 0, w, h, 6, { fill: 'paper' });
  k.rect(w / 2 - 28, -8, 56, 16, 2, { fill: 'rgba(17,17,17,0.06)', stroke: false });        // tape
  k.text(title, 18, 26, { size: 15, weight: 600 });
  items.forEach((it, i) => {
    const yy = 58 + i * 30, tk = ticks[i] || 0;
    k.rect(18, yy - 8, 16, 16, 4, { w: 1.2 });
    if (tk > 0) k.path([[21.5, yy], [25, yy + 3.5], [31, yy - 4]], tk, { w: 1.8, color: L.accent });
    k.text(it, 44, yy, { size: 13, weight: 450, alpha: 0.85 });
  });
  c.restore();
}
function eyedropper(c, x, y, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(-0.78);
  c.lineWidth = 1.3; c.strokeStyle = '#111'; c.lineJoin = 'round'; c.fillStyle = '#fff';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-2.5, -6); c.lineTo(2.5, -6); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(-4, -26, 8, 20, 2); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(-6.5, -36, 13, 10, 3); c.fillStyle = '#111'; c.fill();
  c.restore();
}
function codeCard(c, x, y, lines, shown, L, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.font = '500 13px "Instrument Sans", ui-sans-serif, sans-serif';
  const w = Math.max(...lines.map((l) => c.measureText(l.t).width)) + 40, lh = 24, h = lines.length * lh + 20;
  c.beginPath(); c.roundRect(x, y, w, h, 10); c.fillStyle = L.ink; c.fill();
  lines.forEach((l, i) => {
    const v = clamp(shown * lines.length - i); if (v <= 0) return;
    const yy = y + 10 + i * lh;
    if (l.kind === '-') { c.fillStyle = `rgba(255, 105, 105, ${0.22 * v})`; c.fillRect(x, yy, w, lh); }
    if (l.kind === '+') { c.fillStyle = `rgba(110, 220, 150, ${0.22 * v})`; c.fillRect(x, yy, w, lh); }
    c.globalAlpha = a * v; c.fillStyle = l.kind === '-' ? '#ffb3b3' : l.kind === '+' ? '#a8f0c4' : 'rgba(255,255,255,.75)';
    c.textBaseline = 'middle'; c.fillText(l.t, x + 16, yy + lh / 2 + 0.5); c.globalAlpha = a;
  });
  c.restore();
}

export function render(state, t) {
  const { ctx: c, P, S, parts, W, H, hero } = state;
  const scan = P.look.scans ? state.scan : null, F = state.frameFit;
  const L = P.look, k = makeKit(c, { ink: L.ink, accent: L.accent, paper: L.paper, weight: L.weight, detail: L.detail, plate: 4 });
  c.clearRect(0, 0, W, H);
  const br = prog(S, 'brief', t), sk = prog(S, 'sketch', t), wf = prog(S, 'wireframe', t), de = prog(S, 'design', t), co = prog(S, 'code', t), li = prog(S, 'live', t);
  const fade = 1 - out(li);
  const name = parts.find((p) => p.kind === 'name'), head = parts.find((p) => p.kind === 'head'), mood = parts.find((p) => p.kind === 'mood');
  const texts = parts.filter((p) => p.kind === 'text'), roleP = texts[0], firstP = texts[1];
  const has = (n) => !!S[n];

  // ----- the real page: what's visible when -----
  const serifIn = has('design') ? out(win(de, 0.05, 0.22)) : 0;              // name set in a first-try serif
  const swap = has('design') ? io(win(de, 0.26, 0.38)) : (stageDone(S, 'design', t) ? 1 : 0);   // serif → Hanken
  const restIn = has('design') ? out(win(de, 0.12, 0.36)) : swap;
  const grow = has('design') ? io(win(de, 0.47, 0.62)) : 1;                  // "Bigger?" → the name scales up
  const nameScale = lerp(0.8, 1, grow);
  for (const p of parts) {
    let o = 1;
    if (p.kind === 'name') o = swap;
    if (p.kind === 'text' || p.kind === 'nav') o = restIn;
    if (p.kind === 'navdot') o = has('live') ? out(win(li, 0.2, 0.6)) : (t >= S.total ? 1 : 0);
    if (p.kind === 'cta') o = has('code') ? out(win(co, 0.86, 1)) : restIn;
    if (p.kind === 'head') o = has('live') ? out(clamp(li * 1.4)) : (t >= S.total ? 1 : 0);
    if (p.kind === 'mood') o = has('live') ? out(win(li, 0.45, 1)) : (t >= S.total ? 1 : 0);
    p.el.style.opacity = o.toFixed(3);
  }
  if (name) { name.el.style.transformOrigin = 'left top'; name.el.style.transform = nameScale < 0.999 ? `scale(${nameScale.toFixed(4)})` : ''; }
  if (fade <= 0.001) return;
  c.save(); c.globalAlpha = fade;

  // ----- brief: a sticky note with the three goals, ticked off, then set aside -----
  if (has('brief') && br > 0 && sk < 0.4) {
    const anchor = firstP ? firstP.r : { x: W * 0.1, y: H * 0.5 };
    const drop = back(win(br, 0, 0.16)), leave = io(win(sk, 0, 0.22));
    if (scan?.brief) {
      // his handwritten brief on a taped card: written out, then the boxes get ticked
      const sh = scan.brief, w = 440, ih = (w - 44) * sh.h / sh.w, h = ih + 44;
      const x = anchor.x - 4 - leave * 160, y = anchor.y - 110 - (1 - drop) * 18 - leave * 140, rot = -0.03 + leave * -0.08;
      const a = clamp(br * 6) * (1 - leave);
      if (a > 0) {
        c.save(); c.globalAlpha *= a; c.translate(x + w / 2, y + h / 2); c.rotate(rot); c.translate(-w / 2, -h / 2);
        k.plate(0, 0, w, h, 6); k.rect(0, 0, w, h, 6, { fill: 'paper' });
        k.rect(w / 2 - 30, -8, 60, 16, 2, { fill: 'rgba(17,17,17,0.06)', stroke: false });
        const write = win(br, 0.1, 0.74), sc = (w - 44) / sh.w;
        let at = reveal(state, c, sh, write, 22, 22, w - 44, ih);
        BRIEF_BOXES.forEach(([bx, by], i) => {
          const tp = out(win(br, 0.76 + i * 0.07, 0.84 + i * 0.07));
          if (tp <= 0) return;
          const pts = tickPath(22 + bx * sc, 22 + by * sc, 120 * sc, i * 7);
          k.path(pts, tp, { w: Math.max(1.6, sh.brush * sc * 1.1), color: L.ink });
          if (tp < 1) at = pointAt(pts, tp);
        });
        if (at && br < 0.99) pencil(c, at[0], at[1], 1);
        c.restore();
      }
    } else {
      const x = anchor.x + 10 - leave * 140, y = anchor.y - 60 - (1 - drop) * 18 - leave * 120;
      const ticks = [0, 1, 2].map((i) => out(win(br, 0.3 + i * 0.16, 0.42 + i * 0.16)));
      sticky(c, k, x, y, 300, 160, -0.035 + leave * -0.08, clamp(br * 5) * (1 - leave), P.copy.brief, ticks, L, P.copy.briefTitle);
    }
  }

  // dot grid from the sketch on; a 12-column layout grid during the wireframe
  const gridA = L.grid ? L.gridAlpha * out(Math.max(wf, sk * 0.5)) * (1 - out(co) * 0.6) : 0;
  if (gridA > 0) {
    c.fillStyle = L.ink; c.globalAlpha = fade * gridA;
    for (let x = 12; x < W; x += 24) for (let y = 12; y < H; y += 24) c.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
    c.globalAlpha = fade;
  }
  const colA = has('wireframe') ? out(win(wf, 0.05, 0.35)) * (1 - out(win(de, 0, 0.3))) : 0;
  if (colA > 0 && hero) {
    const cols = 12, gap = 24, cw = (hero.w - gap * (cols - 1)) / cols;
    c.save(); c.globalAlpha = fade * colA * L.columnAlpha;
    for (let i = 0; i < cols; i++) { c.fillStyle = L.accent; c.fillRect(hero.x + i * (cw + gap), 0, cw, H); }
    c.restore();
  }

  // ----- sketch: a first layout gets scribbled out, then the real one is drawn -----
  const drawable = parts.filter((p) => p.kind !== 'mood' && p.kind !== 'navdot');
  let tip = null;
  const firstTry = has('sketch') ? win(sk, 0, 0.32) : 0, strike = has('sketch') ? win(sk, 0.32, 0.46) : 0, firstGone = has('sketch') ? out(win(sk, 0.44, 0.56)) : 1;
  const scanned = !!(scan?.sketch && F);
  if (scanned) {
    // his first try, his scribble across it, then his real sketch; it gives way to the clean wireframe
    if (has('sketch') && firstGone < 1) {
      const t1 = reveal(state, c, scan.first, win(sk, 0.03, 0.34), F.x, F.y, F.w, F.h, 1 - firstGone);
      const t2 = reveal(state, c, scan.scribble, strike, F.x, F.y, F.w, F.h, 1 - firstGone);
      tip = (strike > 0 && strike < 1 ? t2 : null) || (firstTry < 1 ? t1 : null) || tip;
    }
    const realA = 1 - out(win(wf, 0.15, 0.65));
    const t3 = reveal(state, c, scan.sketch, has('sketch') ? win(sk, 0.52, 1) : 1, F.x, F.y, F.w, F.h, realA);
    if (has('sketch') && sk > 0.52 && sk < 1) tip = t3 || tip;
  }
  if (!scanned && has('sketch') && firstGone < 1 && hero) {
    const A = 1 - firstGone;
    drawable.forEach((p, i) => {
      if (p.kind === 'nav') return;
      const r = mirror(p.kind === 'head' ? inset(p.r, 0.06) : p.r, hero);
      const pts = p.kind === 'head' ? sketchOval(r, L.wobble, i * 53) : sketchRect(r, L.wobble * 1.3, i * 29);
      const pDraw = clamp((firstTry - i * 0.1) / 0.5);
      if (pDraw <= 0) return;
      k.path(pts, pDraw, { w: L.weight, alpha: A * 0.75 });
      if (firstTry < 1 && pDraw < 1) tip = pointAt(pts, pDraw);
    });
    // the scribble-out: quick zigzags across the first try
    if (strike > 0) {
      const zz = [], x0 = hero.x + hero.w * 0.08, x1 = hero.x + hero.w * 0.92, y0 = hero.y + 40, y1 = Math.min(H - 40, hero.y + hero.h * 0.8);
      for (let i = 0; i <= 9; i++) zz.push([i % 2 ? x1 - seeded(i) * 60 : x0 + seeded(i + 9) * 60, lerp(y0, y1, i / 9)]);
      k.path(zz, strike, { w: L.weight * 1.4, alpha: A });
      if (strike < 1) tip = pointAt(zz, strike);
    }
  }
  const finalSk = has('sketch') ? win(sk, 0.5, 1) : 1;
  drawable.forEach((p, i) => {
    const n = drawable.length, slot = 1 / n;
    const pDraw = scanned ? (has('wireframe') ? clamp((wf - i * 0.06) / 0.45) : 1)          // over the scan: clean boxes draw in
      : has('sketch') ? clamp((finalSk - i * slot * 0.7) / (slot * 1.6)) : (wf > 0 || stageDone(S, 'sketch', t) ? 1 : 0);
    if (pDraw <= 0) return;
    const clean = scanned ? 1 : io(wf);
    const r = p.kind === 'head' ? inset(p.r, 0.06) : p.r;
    const rough = p.kind === 'head' ? sketchOval(r, L.wobble, i * 31) : p.kind === 'nav' ? sketchPill(r, L.wobble, i * 13) : sketchRect(r, L.wobble, i * 17);
    const neat = p.kind === 'nav' ? roundRectPts(r, r.h / 2, rough.length) : rectPts(r, rough.length);
    const pts = blend(rough, neat, clean);
    const outlineA = p.kind === 'head' ? 1 : p.kind === 'nav' ? 1 - restIn : 1 - out(win(wf, 0.4, 1));
    k.path(pts, pDraw, { w: L.weight, alpha: outlineA });
    if (!scanned && pDraw < 1 && has('sketch') && finalSk > 0 && finalSk < 1) tip = pointAt(pts, pDraw);
    if (p.bars) {
      const barA = out(win(wf, 0.3, 0.8)) * (1 - clamp((p.kind === 'name' ? serifIn : restIn) * 2.5));   // nav bars clear with the rest
      p.bars.forEach((b) => k.rect(b.x, b.y, b.w * out(clamp(wf * 1.4 - 0.2)), b.h, b.h / 2, { fill: 'ink', stroke: false, alpha: barA * 0.12 }));
    }
    if (p.kind === 'cta') {
      const a = out(win(wf, 0.3, 0.8)) * (1 - clamp(restIn * 2.5));
      k.rect(r.x, r.y + r.h * 0.2, r.w * 0.7, r.h * 0.6, 6, { fill: 'ink', stroke: false, alpha: a * 0.12 });
    }
    if (p.kind === 'head') {
      const xa = out(win(wf, 0.5, 1)) * (1 - out(li * 2));
      if (xa > 0) { k.line(r.x, r.y, r.x + r.w, r.y + r.h, { w: 1, alpha: xa * L.detail }); k.line(r.x + r.w, r.y, r.x, r.y + r.h, { w: 1, alpha: xa * L.detail }); }
    }
  });
  if (has('sketch') && sk > 0) {
    const lift = clamp((sk - 0.93) / 0.07) + clamp(wf * 3);
    const at = tip || [W * 0.72, H * 0.8];
    pencil(c, at[0] + lift * 30, at[1] - lift * 30, (1 - clamp(lift)) * clamp(sk * 8));
  }

  // ----- design: type exploration, a review comment, a color pick, resizing, redlines -----
  if (has('design') && de > 0) {
    const dA = 1 - out(win(co, 0.1, 0.6));
    // the name first set in a serif, then swapped for the real face
    if (name && serifIn > 0) {
      const cs = getComputedStyle(name.el), fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || fs;
      const lines = name.el.innerText.split('\n').filter(Boolean);
      c.save(); c.globalAlpha = fade * serifIn * (1 - swap) * dA; c.fillStyle = L.ink; c.textBaseline = 'middle';
      c.translate(name.r.x, name.r.y); c.scale(nameScale, nameScale);
      c.font = `400 ${fs * 0.95}px Georgia, "Times New Roman", serif`;
      lines.forEach((ln, i) => c.fillText(ln, 0, lh * i + lh / 2));
      c.restore();
      const fA = out(win(de, 0.2, 0.28)) * (1 - out(win(de, 0.42, 0.5))) * dA;
      pill(c, name.r.x, name.r.y - 30, swap < 0.5 ? 'Georgia' : 'Hanken Grotesk', swap < 0.5 ? '#8a8a86' : L.accent, '#fff', fA, 'left');
    }
    // his margin notes get written in around the layout
    if (scan?.notes && F) {
      const np = win(de, 0.02, 0.42);
      const nt = reveal(state, c, scan.notes, np, F.x, F.y, F.w, F.h, dA);
      if (nt && np < 1) pencil(c, nt[0], nt[1], dA);
    }
    // the nav gets its auto layout pass as it sets in
    const nav = parts.find((p) => p.kind === 'nav');
    if (nav) {
      const nA = out(win(de, 0.08, 0.16)) * (1 - out(win(de, 0.36, 0.44))) * dA;
      const pad = 4, nr = { x: nav.r.x - pad, y: nav.r.y - pad, w: nav.r.w + pad * 2, h: nav.r.h + pad * 2 };
      selection(c, nr, L.accent, nA);
      pill(c, nr.x + nr.w + 10, nr.y + nr.h / 2 - 10, P.copy.autoLayout, L.accent, '#fff', nA, 'left');
    }
    // the PM leaves a comment, the name grows, the comment resolves
    if (name) {
      const arrive = out(win(de, 0, 0.18));
      const tx = (name.textRight || name.r.x + name.r.w * 0.66) - 18, ty = name.r.y + 6;
      const cA = clamp(de * 8) * dA * (1 - out(win(de, 0.74, 0.82)));
      figmaCursor(c, lerp(-40, tx, arrive), lerp(H * 0.95, ty, arrive) - Math.sin(arrive * Math.PI) * 50, P.copy.otherColor, P.copy.other, cA);
      const pinA = out(win(de, 0.36, 0.42)) * (1 - out(win(de, 0.64, 0.72))) * dA;
      if (pinA > 0) {
        const px = tx + 44, py = name.r.y - 16;   // above the cap line, clear of the letters
        k.circle(px, py, 11, { fill: 'ink', stroke: false, alpha: pinA });
        k.text('1', px, py + 0.5, { size: 11, color: '#fff', align: 'center', alpha: pinA, weight: 600 });
        const resolved = grow > 0.98;
        c.save(); c.globalAlpha = fade * pinA; c.font = '500 13px "Instrument Sans", ui-sans-serif, sans-serif';
        const msg = resolved ? P.copy.commentDone : P.copy.comment, bw = c.measureText(msg).width + 24;
        c.restore();
        k.plate(px + 18, py - 16, bw, 32, 8); k.rect(px + 18, py - 16, bw, 32, 8, { fill: 'paper', alpha: pinA });
        k.text(msg, px + 30, py, { size: 12, weight: 500, alpha: pinA, color: resolved ? L.accent : L.ink });
      }
    }
    // the head box: grabbed and resized; its selection turns blue once the color is picked
    if (head) {
      const r0 = inset(head.r, 0.06);
      const g2 = io(win(de, 0.4, 0.72));
      const r = { x: r0.x, y: r0.y, w: lerp(r0.w * 0.84, r0.w, g2), h: lerp(r0.h * 0.84, r0.h, g2) };
      const picked = out(win(de, 0.8, 0.86));
      const selCol = mix('#8a8a86', L.accent, picked);
      selection(c, r, selCol, out(win(de, 0.05, 0.2)) * dA);
      pill(c, r.x + r.w / 2, r.y + r.h + 10, `${Math.round(r.w)} × ${Math.round(r.h)}`, selCol, '#fff', out(win(de, 0.05, 0.2)) * dA);
      const arrive = out(win(de, 0.04, 0.3));
      const sx = W + 40, sy = H * 0.85;
      let cx = lerp(sx, r0.x + r0.w * 0.84, arrive), cy = lerp(sy, r0.y + r0.h * 0.84, arrive) - Math.sin(arrive * Math.PI) * 60;
      if (g2 > 0) { cx = r.x + r.w; cy = r.y + r.h; }
      // eyedropper over three swatches: it picks the blue
      const swX = r0.x + r0.w - 96, swY = r0.y - 30, sw = out(win(de, 0.7, 0.76)) * (1 - out(win(de, 0.9, 0.98))) * dA;
      const swatches = ['#e2574c', '#3aa676', L.accent];
      if (sw > 0) {
        swatches.forEach((col, i) => { k.circle(swX + i * 30, swY, 10, { fill: col, stroke: false, alpha: sw }); });
        if (picked > 0) k.circle(swX + 60, swY, 15, { color: L.accent, w: 1.6, alpha: sw * picked });
        const dropT = out(win(de, 0.72, 0.8));
        eyedropper(c, lerp(r.x + r.w, swX + 60 + 4, dropT), lerp(r.y + r.h, swY + 2, dropT), sw);
      }
      const cursorA = clamp(de * 6) * dA * (sw > 0.05 ? 0 : 1);
      figmaCursor(c, cx, cy, L.accent, P.copy.you, cursorA);
    }
    // redlines measure the real gaps; a smart guide flashes on the shared top line
    const rA = out(win(de, 0.86, 0.96)) * dA;
    if (name && roleP) redline(c, name.r.x - 18, name.r.y + name.r.h, roleP.r.y, L.guide, rA);
    if (roleP && firstP) redline(c, firstP.r.x - 18, roleP.r.y + roleP.r.h, firstP.r.y, L.guide, rA);
    if (name && head) {
      const g = win(de, 0.6, 0.66) * (1 - win(de, 0.7, 0.76)) * dA;
      if (g > 0) { c.save(); c.globalAlpha = fade * g; c.strokeStyle = L.guide; c.lineWidth = 1; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(name.r.x, inset(head.r, 0.06).y); c.lineTo(head.r.x + head.r.w, inset(head.r, 0.06).y); c.stroke(); c.restore(); }
    }
  }

  // ----- code: inspect the box model, commit the change, run the build -----
  if (has('code') && co > 0) {
    const cA = out(win(co, 0, 0.2)) * (1 - out(win(li, 0, 0.6)));
    if (state.box) {
      const b = state.box, sweep = io(win(co, 0, 0.4));
      c.save(); c.globalAlpha = fade * cA * (1 - out(win(co, 0.7, 0.95)));
      c.beginPath(); c.rect(b.x - b.ml, b.y - b.mt, b.w + b.ml + b.mr, (b.h + b.mt + b.mb) * sweep); c.clip();
      const ring = (o, i2, color) => { c.beginPath(); c.rect(o.x, o.y, o.w, o.h); c.rect(i2.x, i2.y, i2.w, i2.h); c.fillStyle = color; c.fill('evenodd'); };
      const M = { x: b.x - b.ml, y: b.y - b.mt, w: b.w + b.ml + b.mr, h: b.h + b.mt + b.mb }, B = { x: b.x, y: b.y, w: b.w, h: b.h };
      const C = { x: b.x + b.pl, y: b.y + b.pt, w: b.w - b.pl - b.pr, h: b.h - b.pt - b.pb };
      ring(M, B, `rgba(246, 178, 107, ${L.boxModelAlpha})`); ring(B, C, `rgba(147, 196, 125, ${L.boxModelAlpha})`);
      c.fillStyle = `rgba(111, 168, 220, ${L.boxModelAlpha})`; c.fillRect(C.x, C.y, C.w, C.h);
      c.restore();
      pill(c, b.x, b.y - 26, `div.intro  ${Math.round(b.w)} × ${Math.round(b.h)}`, L.ink, '#fff', cA * (1 - out(win(co, 0.7, 0.95))), 'left');
    }
    // the review comment becomes a diff
    if (head) {   // the diff sits in the still-empty head box
      const shown = win(co, 0.12, 0.55), dA2 = out(win(co, 0.1, 0.2)) * (1 - out(win(co, 0.82, 0.95)));
      const hb = inset(head.r, 0.06);
      codeCard(c, hb.x + 28, hb.y + 28, P.copy.diff, shown, L, dA2);
    }
    if (mood) {
      const typed = win(co, 0.5, 0.7), cmd = P.copy.command.slice(0, Math.ceil(typed * P.copy.command.length));
      const building = win(co, 0.7, 0.86), done = co > 0.86, tA = out(win(co, 0.45, 0.55)) * (1 - out(win(li, 0.3, 0.65)));
      if (tA > 0) {
        c.save(); c.globalAlpha = fade * tA; c.font = '500 13px "Instrument Sans", ui-sans-serif, sans-serif';
        const w = Math.max(190, c.measureText(`${P.copy.command}   ${P.copy.done}`).width + 28);
        const x = mood.r.x + mood.r.w / 2 - w / 2, y = mood.r.y + mood.r.h / 2 - 16;
        c.beginPath(); c.roundRect(x, y, w, 32, 999); c.fillStyle = L.ink; c.fill();
        if (building > 0 && !done) { c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x, y, w * io(building), 32); c.restore(); }
        c.fillStyle = '#fff'; c.textBaseline = 'middle';
        if (done) { c.globalAlpha = fade * tA * 0.55; c.fillText(P.copy.command, x + 14, y + 16.5); c.globalAlpha = fade * tA; c.fillStyle = '#7fe0a0'; c.fillText(P.copy.done, x + 14 + c.measureText(P.copy.command + '   ').width, y + 16.5); }
        else c.fillText(building > 0 ? `${P.copy.command}   ${P.copy.building}` : `› ${cmd}${Math.floor(t * 4) % 2 ? '▍' : ''}`, x + 14, y + 16.5);
        c.restore();
      }
    }
  }
  c.restore();
}
function mix(a, b, f) {
  const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = h(a), B = h(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], f))).join(',')})`;
}
const inset = (r, f) => ({ x: r.x + r.w * f, y: r.y + r.h * f, w: r.w * (1 - 2 * f), h: r.h * (1 - 2 * f) });
function roundRectPts(r, rad, n) {
  rad = Math.min(rad, r.w / 2, r.h / 2);
  const sw = r.w - 2 * rad, sh = r.h - 2 * rad, arc = Math.PI * rad / 2, per = 2 * sw + 2 * sh + 4 * arc, pts = [];
  const corner = (cx, cy, a0, f) => [cx + Math.cos(a0 + f * Math.PI / 2) * rad, cy + Math.sin(a0 + f * Math.PI / 2) * rad];
  for (let i = 0; i < n; i++) {
    let d = (i / (n - 1)) * per * 1.03; if (d > per) d -= per;
    const segs = [[sw, (f) => [r.x + rad + f * sw, r.y]], [arc, (f) => corner(r.x + r.w - rad, r.y + rad, -Math.PI / 2, f)], [sh, (f) => [r.x + r.w, r.y + rad + f * sh]], [arc, (f) => corner(r.x + r.w - rad, r.y + r.h - rad, 0, f)],
      [sw, (f) => [r.x + r.w - rad - f * sw, r.y + r.h]], [arc, (f) => corner(r.x + rad, r.y + r.h - rad, Math.PI / 2, f)], [sh, (f) => [r.x, r.y + r.h - rad - f * sh]], [arc, (f) => corner(r.x + rad, r.y + rad, Math.PI, f)]];
    for (const [len, fn] of segs) { if (d <= len || len === 0 && d <= 0) { pts.push(fn(len ? d / len : 0)); d = -1; break; } d -= len; }
    if (d >= 0) pts.push([r.x + rad, r.y]);
  }
  return pts;
}
function rectPts(r, n) {
  const per = r.w * 2 + r.h * 2, pts = [];
  for (let i = 0; i < n; i++) {
    let d = (i / (n - 1)) * per * 1.03;
    if (d > per) d -= per;
    if (d < r.w) pts.push([r.x + d, r.y]);
    else if (d < r.w + r.h) pts.push([r.x + r.w, r.y + d - r.w]);
    else if (d < r.w * 2 + r.h) pts.push([r.x + r.w - (d - r.w - r.h), r.y + r.h]);
    else pts.push([r.x, r.y + r.h - (d - r.w * 2 - r.h)]);
  }
  return pts;
}
function ovalToRect(r, n) { return rectPts(r, n); }

// ---------- lifecycle ----------
export function createIntro(P) {
  const canvas = document.createElement('canvas');
  canvas.className = 'intro-canvas'; canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const mask = document.createElement('canvas');
  const state = { canvas, ctx: canvas.getContext('2d'), mask, mctx: mask.getContext('2d'), scan: null, P, S: schedule(P), parts: collect(), t: 0, raf: 0, playing: false, handedOff: false };
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    state.W = innerWidth; state.H = innerHeight;
    canvas.width = state.W * dpr; canvas.height = state.H * dpr;
    state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mask.width = canvas.width; mask.height = canvas.height;
    measure(state.parts);
    state.frameFit = fitFrame(state.parts);
    const hr = document.querySelector('.hero')?.getBoundingClientRect();
    state.hero = hr ? { x: hr.left, y: hr.top, w: hr.width, h: hr.height } : null;
    const block = document.querySelector('.hero .intro');
    if (block) {
      const r = block.getBoundingClientRect(), cs = getComputedStyle(block), n = (v) => parseFloat(cs[v]) || 0;
      state.box = { x: r.left, y: r.top, w: r.width, h: r.height, pt: n('paddingTop'), pr: n('paddingRight'), pb: n('paddingBottom'), pl: n('paddingLeft'), mt: n('marginTop'), mr: n('marginRight'), mb: n('marginBottom'), ml: n('marginLeft') };
    }
  };
  size();
  const handoff = () => { if (state.handedOff) return; state.handedOff = true; root.dataset.intro = 'done'; dispatchEvent(new Event('intro:handoff')); };
  const frame = (now) => {
    if (!state.playing) return;
    state.t = (now - state.t0) / 1000 * state.P.speed;
    render(state, state.t);
    if (state.S.live ? state.t >= state.S.live.at : state.t >= state.S.total) handoff();
    if (state.t >= state.S.total) { finish(); return; }
    state.raf = requestAnimationFrame(frame);
  };
  const finish = () => {
    state.playing = false; cancelAnimationFrame(state.raf);
    state.ctx.clearRect(0, 0, state.W, state.H);
    // only the name was scaled; other parts (the nav dot) own their transforms
    state.parts.forEach((p) => { p.el.style.opacity = ''; if (p.kind === 'name') { p.el.style.transform = ''; p.el.style.transformOrigin = ''; } });
    handoff(); root.classList.remove('intro-playing');
    state.onEnd?.();
  };
  return {
    state,
    play() { state.S = schedule(state.P); size(); root.classList.add('intro-playing'); root.dataset.intro = 'playing'; state.handedOff = false; state.playing = true; state.t0 = performance.now(); state.raf = requestAnimationFrame(frame); },
    skip() {
      if (!state.playing) return;
      state.playing = false; cancelAnimationFrame(state.raf);
      canvas.style.transition = 'opacity .2s ease-out'; canvas.style.opacity = '0';
      state.parts.forEach((p) => { p.el.style.transition = p.kind === 'name' ? 'opacity .2s ease-out, transform .2s ease-out' : 'opacity .2s ease-out'; p.el.style.opacity = '1'; if (p.kind === 'name') p.el.style.transform = ''; });
      setTimeout(() => { canvas.style.transition = canvas.style.opacity = ''; state.parts.forEach((p) => { p.el.style.transition = ''; }); finish(); }, 220);
    },
    seek(t) { state.playing = false; cancelAnimationFrame(state.raf); state.S = schedule(state.P); size(); root.classList.add('intro-playing'); state.t = t; render(state, t); },
    setParams(P2) { state.P = P2; state.S = schedule(P2); },
    finish,
    resize: size,
  };
}

// ---------- boot ----------
// Landing on Home from outside the site, or reloading it, plays the intro; clicking to Home from
// another page (or going back/forward) doesn't. The inline hold script in build.py applies the same rule.
function shouldPlay() {
  if (FORCE) return true;
  if (REDUCED || innerWidth < 700) return false;
  const nav = performance.getEntriesByType?.('navigation')[0] || {};
  let inside = false; try { inside = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch {}
  return nav.type === 'reload' || (nav.type !== 'back_forward' && !inside);
}
const merge = (a, b) => { const o = Array.isArray(a) ? [...a] : { ...a }; for (const k in (b || {})) o[k] = a && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k]; return o; };

export let intro = null;
if (document.querySelector('.hero') && root.classList.contains('intro-hold')) {
  if (!shouldPlay()) { root.classList.remove('intro-hold'); root.dataset.intro = 'done'; dispatchEvent(new Event('intro:handoff')); }
  else {
    let P = DEFAULTS;
    try { const r = await fetch('/assets/data/intro-params.json', { cache: 'no-store' }); if (r.ok) P = merge(DEFAULTS, await r.json()); } catch {}
    await document.fonts?.ready;
    const scan = P.look.scans ? await loadScans() : null;
    intro = createIntro(P);
    intro.state.scan = scan;
    // hold every part at 0 by hand before releasing the CSS hold, so nothing flashes
    intro.state.parts.forEach((p) => { p.el.style.opacity = '0'; });
    root.classList.remove('intro-hold');
    if (!LAB) {
      const skip = () => intro.skip();
      for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, skip, { once: true, passive: true });
      addEventListener('resize', skip, { once: true });
      intro.state.onEnd = () => { for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'resize']) removeEventListener(ev, skip); };
    }
    intro.play();
    window.__intro = intro;
    dispatchEvent(new Event('intro:ready'));
  }
}
