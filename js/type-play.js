/* ─────────────────────────────────────────────────────────
 * TYPE PLAY: easter-egg hover states on words in the Home copy
 *
 * At rest the words are plain copy. Hover (or tap) plays an effect tied to what the
 * word means; leaving lets it settle back. Variants are picked in /?type-lab.
 *
 *   builder   spray     tool icons burst out from under the words and fall away
 *             toolbelt  the icons fan out and snap into a floating toolbar
 *             stamp     moving across the words stamps icons at the pointer
 *   designer  selection a Figma frame: handles, frame label, live W × H
 *             outlined  letters flip to vector outlines with anchor points
 *   graphic   misreg    CMYK plates drift out of register; crop + registration marks
 *             specimen  baseline / x-height / cap-height guides, letters spread
 *   pm        sort      the letters shuffle, then sort themselves into order
 *             ticket    a ticket slides out; In progress → Done
 *   code      source    the word flips to its markup, with a caret
 *             brackets  < /> slide in, the word takes syntax color
 *   grow      curve     the letters climb an exponential curve
 *             sprout    a stem and two leaves grow out of the w
 *   scale     resize    selection handles; the word scales up, the paragraph steps back
 *             instances copies fan out behind it like component instances
 *   obvious   spotlight the rest of the page dims
 *             annotate  a hand-drawn circle and arrow find the word
 *   ai        ghost     autocomplete ghost text slides in after it
 *             sparkle   sparkles pop, a shimmer runs across the letters
 *   learn     highlight a marker swipe and a margin check
 *             progress  an underline fills like a course, then "✓ learned"
 *   explore   lens      a magnifier follows the pointer over the letters
 *             wander    a dotted trail with a pin wanders the page and comes home
 * ───────────────────────────────────────────────────────── */
import { makeKit, clamp, out, io, back, lerp } from './draw-kit.js';

export const VARIANTS = {
  builder: ['spray', 'toolbelt', 'stamp'], designer: ['selection', 'outlined'], graphic: ['misreg', 'specimen'],
  pm: ['sort', 'ticket'], code: ['source', 'brackets'], grow: ['curve', 'sprout'], scale: ['resize', 'instances'],
  obvious: ['spotlight', 'annotate'], ai: ['ghost', 'sparkle'], learn: ['highlight', 'progress'], explore: ['lens', 'wander'],
};
export const DEFAULTS = {
  hint: 'none',                        // none | dotted | tint
  speed: 1,
  pick: { builder: 'toolbelt', designer: 'selection', graphic: 'misreg', pm: 'ticket', code: 'source', grow: 'curve', scale: 'resize', obvious: 'annotate', ai: 'ghost', learn: 'progress', explore: 'wander' },
  spray: { count: 14, spread: 1, gravity: 1, size: 1 },
  stamp: { spacing: 34 },
  toolbelt: { gap: 36, iconSize: 1, offsetY: 34, arc: 40, stagger: 40, pad: 22, inDur: 450, outDur: 320 },
  selection: { label: 'Role', pad: 4, showSize: true },
  misreg: { offset: 3, marks: 10 },
  ticket: { key: 'PROD-142', title: 'Product management', doneAt: 420, width: 280, offsetY: 12, inDur: 380, outDur: 180 },
  curve: { rise: 0.32, grow: 0.22, stagger: 50 },
  resize: { scale: 1.32, dim: true },
  annotate: { weight: 2, pad: 16, arrow: 70, drawDur: 450 },
  ghost: { text: '-assisted, human-reviewed' },
  progress: { fillDur: 700, thickness: 4, label: '✓ learned', gap: 12 },
  wander: { duration: 2200, reach: 1 },
  lens: { zoom: 1.9, radius: 46 },
  spotlight: { dim: 0.85 },
};
const GROUPS = ['spray', 'stamp', 'toolbelt', 'selection', 'misreg', 'ticket', 'curve', 'resize', 'annotate', 'ghost', 'progress', 'wander', 'lens', 'spotlight'];
export const mergeParams = (base, j) => { const o = { ...base, ...j, pick: { ...base.pick, ...(j?.pick || {}) } }; for (const g of GROUPS) o[g] = { ...base[g], ...(j?.[g] || {}) }; return o; };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
let P = structuredClone(DEFAULTS);
export const setParams = (p) => { P = p; applyHint(); };
export const getParams = () => P;

// ---------- overlay ----------
const canvas = document.createElement('canvas');
canvas.className = 'tp-canvas'; canvas.setAttribute('aria-hidden', 'true');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, dpr = 1;
const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; };
const live = new Set();
let raf = 0;
function loop(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const k = makeKit(ctx, { ink: '#111111', accent: '#2f5bff', paper: '#ffffff', weight: 1.5, detail: 0.4, plate: 4 });
  for (const fx of live) {
    const tIn = (now - fx.t0) / 1000 * P.speed, tOut = fx.tLeave ? (now - fx.tLeave) / 1000 * P.speed : 0;
    const alive = fx.draw ? fx.draw(k, ctx, tIn, tOut, now) : tOut < 0.6;
    if (!alive && fx.tLeave) { live.delete(fx); fx.cleanup?.(); }
  }
  raf = live.size ? requestAnimationFrame(loop) : 0;
}
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

// ---------- helpers ----------
const R = (el) => el.getBoundingClientRect();
const rand = (a, b) => a + Math.random() * (b - a);
function charRects(el) {
  const out = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    for (let i = 0; i < n.length; i++) {
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
      const b = r.getBoundingClientRect(); out.push({ ch: n.data[i], x: b.left, y: b.top, w: b.width, h: b.height });
    }
  }
  return out;
}
function metrics(el) {
  const cs = getComputedStyle(el); ctx.save(); ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = ctx.measureText('Hxg'), x = ctx.measureText('x'), Hm = ctx.measureText('H'); ctx.restore();
  const r = R(el), fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
  const baseline = r.top + (r.height - (fa + fd)) / 2 + fa;
  return { font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, size: parseFloat(cs.fontSize), baseline, xh: x.actualBoundingBoxAscent, cap: Hm.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, color: cs.color };
}
// letters as inline-block spans, only while an effect needs them
function split(el) {
  if (el._letters) return el._letters;
  el._orig = el.innerHTML; const text = el.textContent; el.textContent = '';
  el._letters = [];
  let word = null;   // letters sit in a nowrap word span, so a word can't break across lines once split
  for (const ch of text) {
    if (ch === ' ') { el.append(' '); word = null; continue; }
    if (!word) { word = document.createElement('span'); word.className = 'tpw'; el.append(word); }
    const s = document.createElement('span'); s.className = 'tpl'; s.textContent = ch; word.append(s); el._letters.push(s);
  }
  return el._letters;
}
function unsplit(el) { if (!el._letters) return; el.innerHTML = el._orig; el._letters = null; }
function overlayText(el, html, cls) {          // an absolutely placed layer over the word (document coords)
  const r = R(el), d = document.createElement('span');
  d.className = 'tp-layer ' + (cls || ''); d.setAttribute('aria-hidden', 'true'); d.innerHTML = html;
  const cs = getComputedStyle(el);
  Object.assign(d.style, { left: r.left + scrollX + 'px', top: r.top + scrollY + 'px', height: r.height + 'px', fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, letterSpacing: cs.letterSpacing, lineHeight: r.height + 'px' });   // the font shorthand comes back empty
  document.body.appendChild(d); return d;
}
const para = (el) => el.closest('p');

// ---------- line icons, drawn in the Work-card style in a 24 px box centered on 0,0 ----------
const ICONS = {
  cursor(c) { c.beginPath(); c.moveTo(-6, -9); c.lineTo(-6, 7); c.lineTo(-1.5, 3); c.lineTo(1.5, 9.5); c.lineTo(4, 8.3); c.lineTo(1.2, 2); c.lineTo(6.5, 2); c.closePath(); c.fillStyle = '#2f5bff'; c.fill(); c.strokeStyle = '#fff'; c.stroke(); },
  nib(c) { c.beginPath(); c.moveTo(0, 10); c.lineTo(-6, -1); c.lineTo(-3, -9); c.lineTo(3, -9); c.lineTo(6, -1); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(0, 10); c.lineTo(0, 0); c.stroke(); c.beginPath(); c.arc(0, -1, 1.6, 0, 7); c.stroke(); },
  pencil(c) { c.rotate(0.6); c.beginPath(); c.rect(-3, -11, 6, 15); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-3, 4); c.lineTo(0, 10); c.lineTo(3, 4); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-3, -7); c.lineTo(3, -7); c.stroke(); },
  inspect(c) { c.setLineDash([2.5, 2]); c.strokeRect(-8, -7, 16, 14); c.setLineDash([]); for (const [x, y] of [[-8, -7], [8, -7], [-8, 7], [8, 7]]) { c.fillStyle = '#fff'; c.fillRect(x - 2, y - 2, 4, 4); c.strokeStyle = '#2f5bff'; c.strokeRect(x - 2, y - 2, 4, 4); } },
  ruler(c) { c.rotate(-0.3); c.beginPath(); c.rect(-11, -4, 22, 8); c.fill(); c.stroke(); for (let x = -8; x <= 8; x += 4) { c.beginPath(); c.moveTo(x, -4); c.lineTo(x, x % 8 === 0 ? 0 : -1.5); c.stroke(); } },
  code(c) { c.beginPath(); c.moveTo(-5, -6); c.lineTo(-10, 0); c.lineTo(-5, 6); c.moveTo(5, -6); c.lineTo(10, 0); c.lineTo(5, 6); c.moveTo(2, -8); c.lineTo(-2, 8); c.stroke(); },
  wrench(c) { c.rotate(-0.8); c.beginPath(); c.arc(0, -6, 5, 0.6, Math.PI * 2 - 0.6 + Math.PI * 0.0); c.stroke(); c.beginPath(); c.moveTo(-1.6, -1.5); c.lineTo(-1.6, 10); c.lineTo(1.6, 10); c.lineTo(1.6, -1.5); c.stroke(); },
  component(c) { for (const [x, y] of [[0, -6], [6, 0], [0, 6], [-6, 0]]) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = '#fff'; c.fillRect(-3, -3, 6, 6); c.strokeRect(-3, -3, 6, 6); c.restore(); } },
  node(c) { c.beginPath(); c.moveTo(-10, 6); c.bezierCurveTo(-4, -8, 4, -8, 10, 6); c.stroke(); c.beginPath(); c.moveTo(-8, -4); c.lineTo(8, -4); c.stroke(); for (const x of [-8, 8]) { c.beginPath(); c.arc(x, -4, 1.8, 0, 7); c.fill(); c.stroke(); } c.fillStyle = '#2f5bff'; c.fillRect(-2, -6, 4, 4); },
  eyedropper(c) { c.rotate(-0.78); c.beginPath(); c.moveTo(0, 11); c.lineTo(-2, 6); c.lineTo(2, 6); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.rect(-3, -6, 6, 12); c.fill(); c.stroke(); c.beginPath(); c.roundRect(-5, -12, 10, 6, 2); c.fillStyle = '#111'; c.fill(); },
  layers(c) { for (const y of [4, 0, -4]) { c.beginPath(); c.moveTo(0, y - 5); c.lineTo(9, y); c.lineTo(0, y + 5); c.lineTo(-9, y); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke(); } },
  check(c) { c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-4, 0); c.lineTo(-1, 3.5); c.lineTo(4.5, -3.5); c.strokeStyle = '#2f5bff'; c.lineWidth = 1.8; c.stroke(); },
};
const ICON_NAMES = Object.keys(ICONS);
function icon(c, name, x, y, s = 1, rot = 0, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.lineWidth = 1.5 / s * s; c.strokeStyle = '#111'; c.fillStyle = '#fff'; c.lineJoin = 'round'; c.lineCap = 'round';
  ICONS[name](c); c.restore();
}
function selectionBox(c, r, color, a, label, size) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.strokeStyle = color; c.lineWidth = 1.2; c.strokeRect(r.x, r.y, r.w, r.h);
  for (const [hx, hy] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) { c.fillStyle = '#fff'; c.fillRect(hx - 3.5, hy - 3.5, 7, 7); c.strokeRect(hx - 3.5, hy - 3.5, 7, 7); }
  c.font = '500 12px "Instrument Sans", ui-sans-serif, sans-serif'; c.textBaseline = 'alphabetic';
  if (label) { c.fillStyle = color; c.fillText(label, r.x, r.y - 7); }
  if (size) { const w = c.measureText(size).width + 12; c.beginPath(); c.roundRect(r.x + r.w / 2 - w / 2, r.y + r.h + 7, w, 18, 4); c.fillStyle = color; c.fill(); c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(size, r.x + r.w / 2 - w / 2 + 6, r.y + r.h + 16.5); }
  c.restore();
}
const inOut = (tIn, tOut, inDur = 0.35, outDur = 0.3) => (REDUCED ? 1 : out(clamp(tIn / inDur))) * (1 - (REDUCED ? (tOut > 0 ? 1 : 0) : out(clamp(tOut / outDur))));
const pad = (r, p) => ({ x: r.left - p, y: r.top - p, w: r.width + p * 2, h: r.height + p * 2 });

// ---------- the effects ----------
// each returns an instance { draw?(k, c, tIn, tOut, now) → alive, leave?(), cleanup?() }
const FX = {
  builder: {
    spray(el) {
      const parts = []; let last = 0, leaving = false;
      const burst = (n) => { const r = R(el); for (let i = 0; i < n; i++) parts.push({ x: rand(r.left + 8, r.right - 8), y: r.bottom - 6, vx: rand(-140, 140) * P.spray.spread, vy: rand(-420, -220), vr: rand(-4, 4), r: rand(-0.5, 0.5), name: ICON_NAMES[(Math.random() * ICON_NAMES.length) | 0], s: rand(0.85, 1.25) * P.spray.size, born: performance.now(), life: rand(1.1, 1.6) }); };
      if (REDUCED) return null;
      burst(P.spray.count);
      return {
        leave() { leaving = true; },
        draw(k, c, tIn, tOut, now) {
          if (!leaving && now - last > 140) { last = now; if (tIn > 0.25) burst(2); }
          const dt = 1 / 60;
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i], age = (now - p.born) / 1000;
            p.vy += 980 * P.spray.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
            const a = clamp(age / 0.08) * (1 - clamp((age - p.life + 0.35) / 0.35));
            if (age > p.life || p.y > H + 40) { parts.splice(i, 1); continue; }
            icon(c, p.name, p.x, p.y, p.s * (0.6 + 0.4 * out(clamp(age / 0.15))), p.r, a);
          }
          return !leaving || parts.length > 0;
        },
      };
    },
    toolbelt(el) {
      const names = ['cursor', 'pencil', 'nib', 'inspect', 'node', 'eyedropper', 'code', 'layers'];
      return {
        draw(k, c, tIn, tOut) {
          const T = P.toolbelt, r = R(el), n = names.length, gap = T.gap, rowW = (n - 1) * gap, cx = r.left + Math.min(r.width / 2 + 60, rowW / 2 + T.pad), cy = r.bottom + T.offsetY;
          const opening = REDUCED ? 1 : clamp(tIn / (T.inDur / 1000)), closing = REDUCED ? (tOut > 0 ? 1 : 0) : clamp(tOut / (T.outDur / 1000));
          // one value drives the tray: it opens from the center and closes back into it, plate and face together
          const tray = out(opening) * (1 - io(closing));
          if (tray > 0.001) {
            const fullW = rowW + T.pad * 2, w = fullW * tray, x = cx - w / 2;   // closes to nothing, fade matched to width
            c.save(); c.globalAlpha = clamp(tray * 1.25) * clamp(w / 60);
            k.plate(x, cy - 22, w, 44, 999); k.rect(x, cy - 22, w, 44, 999, { fill: 'paper', w: 1.2 });
            c.restore();
          }
          names.forEach((name, i) => {
            const st = (i * T.stagger) / 1000, inner = (n - 1 - i) * T.stagger * 0.5 / 1000;
            const f = REDUCED ? (tOut > 0 ? 0 : 1) : back(clamp((tIn - st) / (T.inDur / 1000))) * (1 - io(clamp((tOut - inner * 0.6) / (T.outDur / 1000 * 0.8))));
            const sx = r.left + r.width / 2, sy = r.top + r.height / 2, tx = cx - rowW / 2 + i * gap, ty = cy;
            const arc = Math.sin(clamp(f) * Math.PI) * -T.arc;
            icon(c, name, lerp(sx, tx, f), lerp(sy, ty, f) + arc, (0.5 + 0.5 * clamp(f)) * T.iconSize, (1 - clamp(f)) * 2, clamp(f * 2));
          });
          return tray > 0.001 || tOut === 0;
        },
      };
    },
    stamp(el) {
      const stamps = []; let lx = null, ly = null, leaving = false;
      const move = (e) => { if (lx === null || Math.hypot(e.clientX - lx, e.clientY - ly) > P.stamp.spacing) { lx = e.clientX; ly = e.clientY; stamps.push({ x: lx, y: ly - 4, name: ICON_NAMES[stamps.length % ICON_NAMES.length], r: rand(-0.35, 0.35), born: performance.now() }); } };
      el.addEventListener('pointermove', move);
      return {
        leave() { leaving = true; el.removeEventListener('pointermove', move); },
        draw(k, c, tIn, tOut, now) {
          for (let i = stamps.length - 1; i >= 0; i--) {
            const s = stamps[i], age = (now - s.born) / 1000;
            if (age > 1.4) { stamps.splice(i, 1); continue; }
            icon(c, s.name, s.x, s.y, REDUCED ? 1 : back(clamp(age / 0.22)), s.r, 1 - clamp((age - 1.0) / 0.4));
          }
          return !leaving || stamps.length > 0;
        },
      };
    },
  },
  designer: {
    selection(el) {
      return { draw(k, c, tIn, tOut) {
        const a = inOut(tIn, tOut), r = pad(R(el), P.selection.pad), grow = REDUCED ? 1 : out(clamp(tIn / 0.3));
        const rr = { x: r.x + r.w * (1 - grow) / 2, y: r.y + r.h * (1 - grow) / 2, w: r.w * grow, h: r.h * grow };
        selectionBox(c, rr, '#2f5bff', a, P.selection.label, P.selection.showSize ? `${Math.round(rr.w)} × ${Math.round(rr.h)}` : null);
        return tOut < 0.35;
      } };
    },
    outlined(el) {
      el.classList.add('tp-outline');
      const pts = charRects(el).filter((q) => q.ch.trim());
      const m = metrics(el);
      return {
        leave() { el.classList.remove('tp-outline'); },
        draw(k, c, tIn, tOut) {
          const a = inOut(tIn, tOut, 0.3, 0.25);
          c.save(); c.globalAlpha = a;
          pts.forEach((q, i) => {
            const d = REDUCED ? 1 : clamp((tIn - i * 0.025) / 0.2);
            if (d <= 0) return;
            const xs = [q.x + q.w * 0.12, q.x + q.w * 0.88], ytop = m.baseline - (/[A-Zbdfhklt]/.test(q.ch) ? m.cap : m.xh);
            for (const [x, y] of [[xs[0], m.baseline], [xs[1], m.baseline], [q.x + q.w / 2, ytop]]) { c.fillStyle = '#fff'; c.strokeStyle = '#2f5bff'; c.lineWidth = 1; c.fillRect(x - 2.5 * d, y - 2.5 * d, 5 * d, 5 * d); c.strokeRect(x - 2.5 * d, y - 2.5 * d, 5 * d, 5 * d); }
            if (i % 3 === 0) { const x = q.x + q.w / 2; c.strokeStyle = 'rgba(47,91,255,.55)'; c.beginPath(); c.moveTo(x - 10 * d, ytop); c.lineTo(x + 10 * d, ytop); c.stroke(); for (const hx of [x - 10 * d, x + 10 * d]) { c.beginPath(); c.arc(hx, ytop, 2, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke(); } }
          });
          c.restore();
          return tOut < 0.3;
        },
      };
    },
  },
  graphic: {
    misreg(el) {
      const plates = ['#00aeef', '#ec008c', '#ffe600'].map((col, i) => { const d = overlayText(el, el.innerHTML, 'tp-plate'); d.style.color = col; return d; });
      el.classList.add('tp-ghosted');
      const dirs = [[-1, -0.6], [1, 0.4], [0.2, 1]];
      const set = (f) => plates.forEach((d, i) => { d.style.transform = `translate(${dirs[i][0] * P.misreg.offset * f}px, ${dirs[i][1] * P.misreg.offset * f}px)`; });
      set(0); requestAnimationFrame(() => plates.forEach((d) => d.classList.add('on')));
      return {
        leave() { set(0); },
        cleanup() { plates.forEach((d) => d.remove()); el.classList.remove('tp-ghosted'); },
        draw(k, c, tIn, tOut) {
          const a = inOut(tIn, tOut);
          set(REDUCED ? (tOut > 0 ? 0 : 1) : out(clamp(tIn / 0.4)) * (1 - out(clamp(tOut / 0.3))));
          const r = pad(R(el), 8), L = P.misreg.marks;
          c.save(); c.globalAlpha = a; c.strokeStyle = '#111'; c.lineWidth = 0.8;
          for (const [x, y, sx, sy] of [[r.x, r.y, -1, -1], [r.x + r.w, r.y, 1, -1], [r.x, r.y + r.h, -1, 1], [r.x + r.w, r.y + r.h, 1, 1]]) {
            c.beginPath(); c.moveTo(x + sx * 3, y); c.lineTo(x + sx * (3 + L), y); c.moveTo(x, y + sy * 3); c.lineTo(x, y + sy * (3 + L)); c.stroke();
          }
          const rx = r.x + r.w + 22, ry = r.y + r.h / 2;
          c.beginPath(); c.arc(rx, ry, 5, 0, 7); c.moveTo(rx - 9, ry); c.lineTo(rx + 9, ry); c.moveTo(rx, ry - 9); c.lineTo(rx, ry + 9); c.stroke();
          c.restore();
          return tOut < 0.35;
        },
      };
    },
    specimen(el) {
      const letters = split(el), m = metrics(el);
      const spread = (f) => letters.forEach((s, i) => { s.style.transform = `translateX(${(i - (letters.length - 1) / 2) * 0.8 * f}px)`; });
      requestAnimationFrame(() => spread(1));
      return {
        leave() { spread(0); },
        cleanup() { unsplit(el); },
        draw(k, c, tIn, tOut) {
          const a = inOut(tIn, tOut), r = R(el), x0 = r.left - 26, x1 = r.right + 26, draw = REDUCED ? 1 : out(clamp(tIn / 0.45));
          const lines = [['baseline', m.baseline], ['x-height', m.baseline - m.xh], ['cap height', m.baseline - m.cap]];
          c.save(); c.globalAlpha = a; c.lineWidth = 1; c.font = '500 11px "Instrument Sans", ui-sans-serif, sans-serif';
          lines.forEach(([label, y], i) => {
            c.strokeStyle = i === 0 ? '#2f5bff' : 'rgba(47,91,255,.45)'; c.beginPath(); c.moveTo(x0, y); c.lineTo(lerp(x0, x1, draw), y); c.stroke();
            c.fillStyle = 'rgba(47,91,255,.8)'; c.fillText(label, x1 + 6, y + (i === 2 ? -4 : i === 1 ? 12 : 4));
          });
          const rects = charRects(el).filter((q) => q.ch.trim());
          c.strokeStyle = 'rgba(17,17,17,.35)';
          for (let i = 1; i < rects.length; i++) { const x = (rects[i - 1].x + rects[i - 1].w + rects[i].x) / 2; c.beginPath(); c.moveTo(x, m.baseline + 6); c.lineTo(x, m.baseline + 12); c.stroke(); }
          c.restore();
          return tOut < 0.35;
        },
      };
    },
  },
  pm: {
    sort(el) {
      const letters = split(el);
      const words = []; let cur = [];
      // letters per word, so each word sorts within itself
      const text = el.textContent; let li = 0;
      for (const ch of text) { if (ch === ' ') { words.push(cur); cur = []; } else cur.push(letters[li++]); }
      words.push(cur);
      const rects = letters.map((s) => s.getBoundingClientRect());
      const place = (orderFor) => {
        for (const w of words) {
          const idx = w.map((s) => letters.indexOf(s)), order = orderFor(idx);
          let x = rects[idx[0]].left;
          order.forEach((j) => { letters[j].style.transform = `translateX(${x - rects[j].left}px)`; x += rects[j].width; });
        }
      };
      const shuffled = (idx) => [...idx].sort(() => Math.random() - 0.5);
      const sorted = (idx) => [...idx].sort((a, b) => letters[a].textContent.localeCompare(letters[b].textContent));
      const timers = [];
      if (REDUCED) { place(sorted); } else { requestAnimationFrame(() => place(shuffled)); timers.push(setTimeout(() => place(sorted), 380 / P.speed)); }
      return {
        leave() { timers.forEach(clearTimeout); letters.forEach((s) => { s.style.transform = ''; }); },
        cleanup() { unsplit(el); },
      };
    },
    ticket(el) {
      // a Jira card: summary on top; type icon, key, priority, points and assignee along the bottom;
      // the status lozenge flips In progress → Done with a little settle
      const lozenge = (k, c, x, y, label, bg, fg, a) => { c.save(); c.globalAlpha *= a; c.font = '700 11px "Instrument Sans", ui-sans-serif, sans-serif'; const w = c.measureText(label).width + 12; k.rect(x - w, y, w, 18, 3, { fill: bg, stroke: false }); k.text(label, x - w + 6, y + 9.5, { size: 10, weight: 700, color: fg }); c.restore(); return w; };
      return { draw(k, c, tIn, tOut) {
        const T = P.ticket, r = R(el), w = T.width, h = 86;
        const enter = REDUCED ? 1 : clamp(tIn / (T.inDur / 1000)), exit = REDUCED ? (tOut > 0 ? 1 : 0) : clamp(tOut / (T.outDur / 1000));
        const a = out(enter) * (1 - io(exit) ** 0.6);   // leaves quickly, so it isn't see-through over the copy for long
        if (a <= 0.001) return tOut === 0;
        const lift = (1 - back(enter)) * 10 + io(exit) * -8, s = lerp(0.96, 1, out(enter)) * lerp(1, 0.98, exit);
        const x = r.left, y = r.bottom + T.offsetY + lift;
        c.save(); c.globalAlpha = a; c.translate(x + w / 2, y + h / 2); c.scale(s, s); c.translate(-w / 2, -h / 2);
        // card: white, 3px corners, soft Jira shadow
        c.save(); c.shadowColor = 'rgba(9,30,66,0.25)'; c.shadowBlur = 3; c.shadowOffsetY = 1; c.beginPath(); c.roundRect(0, 0, w, h, 3); c.fillStyle = '#fff'; c.fill(); c.restore();
        c.save(); c.shadowColor = 'rgba(9,30,66,0.13)'; c.shadowBlur = 12; c.shadowOffsetY = 6; c.beginPath(); c.roundRect(0, 0, w, h, 3); c.fillStyle = '#fff'; c.fill(); c.restore();
        k.text(T.title, 12, 22, { size: 14, weight: 500, color: '#172b4d' });
        // bottom row: story icon (green bookmark), key, priority, points, avatar
        const by = h - 22;
        c.beginPath(); c.roundRect(12, by - 8, 16, 16, 3); c.fillStyle = '#36b37e'; c.fill();
        c.beginPath(); c.moveTo(16.5, by - 4); c.lineTo(23.5, by - 4); c.lineTo(23.5, by + 5); c.lineTo(20, by + 2); c.lineTo(16.5, by + 5); c.closePath(); c.fillStyle = '#fff'; c.fill();
        k.text(T.key, 34, by + 0.5, { size: 12, weight: 500, color: '#5e6c84' });
        c.save(); c.strokeStyle = '#ff7452'; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round';
        for (const dy of [-3, 2]) { c.beginPath(); c.moveTo(w - 96, by + dy + 3); c.lineTo(w - 91, by + dy - 2); c.lineTo(w - 86, by + dy + 3); c.stroke(); }
        c.restore();
        k.rect(w - 74, by - 9, 20, 18, 999, { fill: '#dfe1e6', stroke: false }); k.text('3', w - 64, by + 0.5, { size: 11, weight: 600, color: '#172b4d', align: 'center' });
        k.circle(w - 26, by, 12, { fill: '#2f5bff', stroke: false }); k.text('BG', w - 26, by + 0.5, { size: 10, weight: 700, color: '#fff', align: 'center' });
        // status lozenge, top right: one lozenge that morphs. Width and color ease across, the label swaps
        // in the middle (IN PROGRESS out fast, DONE in), and it settles with a small bump
        const flip = REDUCED ? 1 : io(clamp((tIn - T.doneAt / 1000) / 0.24));
        c.save(); c.font = '700 10px "Instrument Sans", ui-sans-serif, sans-serif';
        const wA = c.measureText('IN PROGRESS').width + 12, wB = c.measureText('DONE').width + 12, lw = lerp(wA, wB, flip), lx = w - 12 - lw, ly = 34;
        const bump = 1 + Math.sin(clamp((tIn - T.doneAt / 1000 - 0.12) / 0.22) * Math.PI) * 0.07 * (REDUCED ? 0 : 1);
        c.translate(w - 12, ly + 9); c.scale(bump, bump); c.translate(-(w - 12), -(ly + 9));
        const mixc = (a1, b1) => { const h = (x) => [1, 3, 5].map((k2) => parseInt(x.slice(k2, k2 + 2), 16)); const A = h(a1), B = h(b1); return `rgb(${A.map((v, q) => Math.round(lerp(v, B[q], flip))).join(',')})`; };
        k.rect(lx, ly, lw, 18, 3, { fill: mixc('#deebff', '#e3fcef'), stroke: false });
        c.save(); c.beginPath(); c.rect(lx, ly, lw, 18); c.clip();
        const outA = 1 - clamp(flip / 0.45), inA = clamp((flip - 0.4) / 0.6);
        if (outA > 0) k.text('IN PROGRESS', lx + 6, ly + 9.5, { size: 10, weight: 700, color: '#0747a6', alpha: outA });
        if (inA > 0) k.text('DONE', lx + 6, ly + 9.5 + (1 - inA) * 4, { size: 10, weight: 700, color: '#006644', alpha: inA });
        c.restore(); c.restore();
        c.restore();
        return a > 0.001 || tOut === 0;
      } };
    },
  },
  code: {
    source(el) {
      const d = overlayText(el, '<span class="g">&lt;</span><span class="t">span</span><span class="g">&gt;</span>code<span class="g">&lt;/</span><span class="t">span</span><span class="g">&gt;</span><i class="caret"></i>', 'tp-source');
      el.classList.add('tp-ghosted');
      requestAnimationFrame(() => d.classList.add('on'));
      return { leave() { d.classList.remove('on'); el.classList.remove('tp-ghosted'); }, cleanup() { d.remove(); } };
    },
    brackets(el) {
      const l = overlayText(el, '&lt;', 'tp-br left'), r = overlayText(el, '/&gt;', 'tp-br right');
      r.style.left = R(el).right + scrollX + 'px';
      el.classList.add('tp-syntax');
      requestAnimationFrame(() => { l.classList.add('on'); r.classList.add('on'); });
      return { leave() { l.classList.remove('on'); r.classList.remove('on'); el.classList.remove('tp-syntax'); }, cleanup() { l.remove(); r.remove(); } };
    },
  },
  grow: {
    curve(el) {
      const letters = split(el), n = letters.length;
      requestAnimationFrame(() => letters.forEach((s, i) => { const f = (Math.exp(i / (n - 1) * 2) - 1) / (Math.E ** 2 - 1); s.style.transitionDelay = `${i * P.curve.stagger}ms`; s.style.transform = `translateY(${-f * P.curve.rise}em) scale(${1 + f * P.curve.grow})`; }));
      return { leave() { letters.forEach((s, i) => { s.style.transitionDelay = `${(n - 1 - i) * 30}ms`; s.style.transform = ''; }); }, cleanup() { unsplit(el); } };
    },
    sprout(el) {
      return { draw(k, c, tIn, tOut) {
        const rs = charRects(el), w = rs[rs.length - 1], m = metrics(el);
        const g = REDUCED ? (tOut > 0 ? 0 : 1) : io(clamp(tIn / 0.6)) * (1 - io(clamp(tOut / 0.35)));
        if (g <= 0) return tOut < 0.4;
        const bx = w.x + w.w * 0.5, by = m.baseline - m.xh - 1;
        const stem = [[bx, by], [bx + 3, by - 20], [bx - 3, by - 40], [bx + 4, by - 60]];
        k.path(stem, g, { w: 1.6, color: '#111' });
        const leaf = (side, at, sz) => { const lf = clamp((g - at) / 0.3); if (lf <= 0) return; const [x, y] = stem[2]; c.save(); c.translate(x, y + (at < 0.6 ? 6 : -6)); c.rotate(side * 0.7); c.scale(lf, lf); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(side * sz * 0.6, -sz * 0.5, side * sz, 0); c.quadraticCurveTo(side * sz * 0.6, sz * 0.4, 0, 0); c.fillStyle = 'rgba(47,91,255,0.12)'; c.fill(); c.strokeStyle = '#2f5bff'; c.lineWidth = 1.4; c.stroke(); c.restore(); };
        leaf(1, 0.45, 24); leaf(-1, 0.65, 19);
        return tOut < 0.4;
      } };
    },
  },
  scale: {
    resize(el) {
      // a copy of the word scales up over the original (the layout never changes); the paragraph steps back
      const d = overlayText(el, el.innerHTML, 'tp-lift');
      el.classList.add('tp-ghosted'); if (P.resize.dim) para(el)?.classList.add('tp-dim');
      d.style.setProperty('--tp-scale', P.resize.scale);
      requestAnimationFrame(() => d.classList.add('on'));
      return {
        leave() { d.classList.remove('on'); para(el)?.classList.remove('tp-dim'); },
        cleanup() { d.remove(); el.classList.remove('tp-ghosted'); },
        draw(k, c, tIn, tOut) {
          const a = inOut(tIn, tOut), r = pad(d.getBoundingClientRect(), 3);
          selectionBox(c, r, '#2f5bff', a, null, `${Math.round(r.w)} × ${Math.round(r.h)}`);
          return tOut < 0.45;
        },
      };
    },
    instances(el) {
      const m = metrics(el);
      return { draw(k, c, tIn, tOut) {
        const r = R(el), f = REDUCED ? (tOut > 0 ? 0 : 1) : out(clamp(tIn / 0.45)) * (1 - out(clamp(tOut / 0.3)));
        c.save(); c.font = m.font; c.textBaseline = 'alphabetic';
        for (let i = 3; i >= 1; i--) { c.globalAlpha = f * (0.32 - i * 0.07); c.fillStyle = '#2f5bff'; c.fillText(el.textContent, r.left + i * 14 * f, m.baseline - i * 12 * f); }
        c.restore();
        icon(c, 'component', r.right + 22, r.top + r.height * 0.35, 0.7, 0, f);
        return tOut < 0.35;
      } };
    },
  },
  obvious: {
    spotlight(el) {
      return { draw(k, c, tIn, tOut) {
        const a = (REDUCED ? 1 : out(clamp(tIn / 0.3))) * (1 - out(clamp(tOut / 0.35))) * P.spotlight.dim;
        const r = pad(R(el), 10);
        c.save(); c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.rect(0, 0, W, H); c.roundRect(r.x, r.y, r.w, r.h, 12); c.fill('evenodd'); c.restore();
        return tOut < 0.4;
      } };
    },
    annotate(el) {
      const seed = Math.random() * 10;
      return { draw(k, c, tIn, tOut) {
        const r = R(el), cx = r.left + r.width / 2, cy = r.top + r.height / 2, rx = r.width / 2 + P.annotate.pad, ry = r.height / 2 + P.annotate.pad / 2;
        const ring = []; for (let i = 0; i <= 48; i++) { const t = -0.4 + (i / 44) * Math.PI * 2; const j = 1 + 0.04 * Math.sin(t * 3 + seed); ring.push([cx + Math.cos(t) * rx * j, cy + Math.sin(t) * ry * j]); }
        const dd = P.annotate.drawDur / 1000, d1 = REDUCED ? 1 : io(clamp(tIn / dd)), d2 = REDUCED ? 1 : io(clamp((tIn - dd * 0.78) / (dd * 0.78))), fa = 1 - out(clamp(tOut / 0.3));
        k.path(ring, d1, { w: P.annotate.weight, alpha: fa });
        const ax = cx + rx + P.annotate.arrow, ay = cy - ry - P.annotate.arrow * 0.7, ex = cx + rx * 0.72, ey = cy - ry * 0.75;
        const arrow = []; for (let i = 0; i <= 16; i++) { const t = i / 16; arrow.push([lerp(ax, ex, t) + Math.sin(t * Math.PI) * 12, lerp(ay, ey, t) - Math.sin(t * Math.PI) * 8]); }
        k.path(arrow, d2, { w: P.annotate.weight, alpha: fa });
        if (d2 >= 1) { const [hx, hy] = arrow[16], [px, py] = arrow[14], ang = Math.atan2(hy - py, hx - px); k.path([[hx - Math.cos(ang - 0.5) * 11, hy - Math.sin(ang - 0.5) * 11], [hx, hy], [hx - Math.cos(ang + 0.5) * 11, hy - Math.sin(ang + 0.5) * 11]], 1, { w: P.annotate.weight, alpha: fa }); }
        return tOut < 0.35;
      } };
    },
  },
  ai: {
    ghost(el) {
      // autocomplete laid over the rest of the line (paper behind it), so nothing reflows
      const g = overlayText(el, `<span class="txt">${P.ghost.text}</span><span class="tab">Tab</span>`, 'tp-ghost');
      g.style.left = R(el).right + scrollX + 'px';
      requestAnimationFrame(() => { g.style.width = g.scrollWidth + 'px'; g.classList.add('on'); });
      return { leave() { g.style.width = '0px'; g.classList.remove('on'); }, cleanup() { g.remove(); }, draw(k, c, tIn, tOut) { return tOut < 0.45; } };
    },
    sparkle(el) {
      el.classList.add('tp-shimmer');
      const spots = Array.from({ length: 7 }, (_, i) => ({ fx: rand(-0.2, 1.2), fy: rand(-0.4, 1.3), s: rand(0.5, 1), at: i * 0.06 + rand(0, 0.08) }));
      return {
        leave() { el.classList.remove('tp-shimmer'); },
        draw(k, c, tIn, tOut) {
          if (REDUCED) return false;
          const r = R(el), fa = 1 - out(clamp(tOut / 0.3));
          for (const s of spots) {
            const p = clamp((tIn - s.at) / 0.35), sz = 11 * s.s * back(p) * (tIn > 1.2 ? 1 - clamp((tIn - 1.2 - s.at) / 0.3) : 1);
            if (sz <= 0.1) continue;
            const x = r.left + r.width * s.fx, y = r.top + r.height * s.fy; 
            // a four-point sparkle: concave sides pulled toward the center
            c.save(); c.globalAlpha = fa; c.translate(x, y); c.rotate((1 - p) * 0.6); c.beginPath(); c.moveTo(0, -sz);
            for (const [ax, ay] of [[sz, 0], [0, sz], [-sz, 0], [0, -sz]]) c.quadraticCurveTo(0, 0, ax, ay);
            c.fillStyle = '#2f5bff'; c.fill(); c.restore();
          }
          return tOut < 0.35;
        },
      };
    },
  },
  learn: {
    highlight(el) {
      el.classList.add('tp-mark');
      return { leave() { el.classList.remove('tp-mark'); }, draw(k, c, tIn, tOut) {
        const r = R(el), d = REDUCED ? 1 : clamp((tIn - 0.35) / 0.25), fa = 1 - out(clamp(tOut / 0.3));
        k.path([[r.right + 6, r.top + 6], [r.right + 10, r.top + 11], [r.right + 18, r.top - 1]], d, { w: 1.8, color: '#2f5bff', alpha: fa });
        return tOut < 0.35;
      } };
    },
    progress(el) {
      // the bar fills under the word; the label sits at its right end, on the bar's line
      return { draw(k, c, tIn, tOut) {
        const T = P.progress, r = R(el), fa = 1 - out(clamp(tOut / 0.3)), fill = REDUCED ? 1 : io(clamp((tIn - 0.1) / (T.fillDur / 1000))), y = r.bottom + 2, th = T.thickness;
        c.save(); c.globalAlpha = fa * (REDUCED ? 1 : out(clamp(tIn / 0.15)));
        c.fillStyle = 'rgba(17,17,17,0.1)'; c.beginPath(); c.roundRect(r.left, y, r.width, th, th / 2); c.fill();
        c.fillStyle = '#2f5bff'; c.beginPath(); c.roundRect(r.left, y, r.width * fill, th, th / 2); c.fill();
        if (fill >= 1) {
          const t = REDUCED ? 1 : out(clamp((tIn - 0.1 - T.fillDur / 1000) / 0.2));
          c.globalAlpha *= t; c.font = '600 13px "Instrument Sans", ui-sans-serif, sans-serif'; c.fillStyle = '#2f5bff'; c.textBaseline = 'middle';
          c.fillText(T.label, r.right + T.gap - (1 - t) * 6, y + th / 2 + 0.5);
        }
        c.restore();
        return tOut < 0.35;
      } };
    },
  },
  explore: {
    lens(el) {
      let px = null, py = null; const mv = (e) => { px = e.clientX; py = e.clientY; };
      el.addEventListener('pointermove', mv);
      const m = metrics(el);
      return {
        leave() { el.removeEventListener('pointermove', mv); },
        draw(k, c, tIn, tOut) {
          if (px === null) return tOut < 0.3;
          const r = R(el), z = P.lens.zoom, rad = P.lens.radius * (REDUCED ? 1 : back(clamp(tIn / 0.3))) * (1 - out(clamp(tOut / 0.25)));
          if (rad <= 1) return tOut < 0.3;
          const cx = px, cy = py - 6;
          c.save(); c.beginPath(); c.arc(cx, cy, rad, 0, 7); c.fillStyle = '#fff'; c.fill(); c.clip();
          c.translate(cx, cy); c.scale(z, z); c.translate(-cx, -cy);
          c.font = m.font; c.fillStyle = '#111'; c.textBaseline = 'alphabetic'; c.fillText(el.textContent, r.left, m.baseline);
          c.restore();
          c.save(); c.lineWidth = 1.5; c.strokeStyle = '#111'; c.beginPath(); c.arc(cx, cy, rad, 0, 7); c.stroke();
          c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx + rad * 0.72, cy + rad * 0.72); c.lineTo(cx + rad * 1.15, cy + rad * 1.15); c.stroke(); c.restore();
          return tOut < 0.3;
        },
      };
    },
    wander(el) {
      if (REDUCED) return null;
      const r0 = R(el), sx = r0.right + 4, sy = r0.bottom - 4;
      const up = (v) => Math.max(70, v), Rch = P.wander.reach;
      const way = [[sx, sy], [Math.min(W - 60, sx + rand(80, 160) * Rch), up(sy - rand(10, 60) * Rch)], [Math.min(W - 60, sx + rand(240, 380) * Rch), up(sy - rand(120, 220) * Rch)], [Math.min(W - 60, sx + rand(120, 260) * Rch), up(sy - rand(300, 420) * Rch)], [Math.max(40, sx - rand(40, 160) * Rch), up(sy - rand(180, 280) * Rch)], [sx, sy]];
      const pts = []; for (let i = 0; i < way.length - 1; i++) { const p0 = way[Math.max(0, i - 1)], p1 = way[i], p2 = way[i + 1], p3 = way[Math.min(way.length - 1, i + 2)]; for (let t = 0; t < 1; t += 0.05) { const t2 = t * t, t3 = t2 * t; pts.push([0, 1].map((d) => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))); } }
      pts.push([sx, sy]);
      const dy = () => R(el).bottom - 4 - sy;   // follow the word if the page scrolls
      return { draw(k, c, tIn, tOut) {
        const p = clamp(tIn / (P.wander.duration / 1000)), back2 = clamp(tOut / 0.5), shown = p * (1 - back2);
        if (shown <= 0 && tOut > 0) return false;
        c.save(); c.translate(0, dy()); c.setLineDash([2, 7]); k.path(pts, shown, { w: 1.6, color: '#2f5bff' }); c.restore();
        const i = Math.max(0, Math.min(pts.length - 1, Math.floor(shown * (pts.length - 1)))), [x, y] = pts[i];
        c.save(); c.translate(x, y + dy() - 4); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-7, -9, -7, -18, 0, -18); c.bezierCurveTo(7, -18, 7, -9, 0, 0); c.fillStyle = '#2f5bff'; c.fill(); c.beginPath(); c.arc(0, -12.5, 2.4, 0, 7); c.fillStyle = '#fff'; c.fill(); c.restore();
        return true;
      } };
    },
  },
};

// ---------- wiring ----------
function applyHint() { root.dataset.tpHint = P.hint; }
function start(el) {
  const key = el.dataset.tp, v = P.pick[key];
  if (!v || v === 'off' || !FX[key]?.[v]) return null;
  el.classList.add('tp-on');
  const inst = FX[key][v](el) || {};
  inst.t0 = performance.now(); inst.el = el; inst.key = key;
  live.add(inst); kick();
  return inst;
}
function stop(inst) {
  if (!inst || inst.tLeave) return;
  inst.tLeave = performance.now(); inst.leave?.(); inst.el.classList.remove('tp-on');
  if (!inst.draw) setTimeout(() => { live.delete(inst); inst.cleanup?.(); }, 520 / P.speed);
}
function wire() {
  size(); addEventListener('resize', size);
  document.body.appendChild(canvas); applyHint();
  document.querySelectorAll('.tp').forEach((el) => {
    let cur = null;
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; stop(cur); cur = start(el); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; stop(cur); cur = null; });
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; stop(cur); const inst = start(el); cur = inst; setTimeout(() => stop(inst), 1400); });
  });
}

// params, then wait for the intro to hand off
try { const r = await fetch('/assets/data/type-params.json', { cache: 'no-store' }); if (r.ok) P = mergeParams(DEFAULTS, await r.json()); } catch {}
if (root.dataset.intro === 'playing' || root.classList.contains('intro-hold')) addEventListener('intro:handoff', wire, { once: true });
else wire();
window.__typePlay = { setParams, getParams };
