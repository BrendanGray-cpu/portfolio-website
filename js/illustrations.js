/* ─────────────────────────────────────────────────────────
 * PROJECT ILLUSTRATIONS (ported from design-lab/illustrations.html)
 *
 * Line drawings in one shared system: one ink weight for objects, a lighter
 * one for detail, paper fills so overlaps occlude, one blue accent object per
 * card, a small offset plate for depth, 9px mono labels.
 * Hovering the card plays the project's story; leaving rewinds it at 2×.
 *
 * Usage: <canvas data-illustration="contract"></canvas> inside an element with
 * [data-card]; the card is the hover target.
 * ───────────────────────────────────────────────────────── */

const V = {
  ink: '#111111', accent: '#2f5bff', paper: '#ffffff',
  weight: 1.5, detail: 0.4, plate: 5,
  hover: { speed: 1 },
  card: { grid: true, gridSize: 20, gridOpacity: 0.35, scale: 0.92 },
};
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

import { makeKit, clamp, out, io, back, seg, lerp } from './draw-kit.js';
const kit = (ctx) => makeKit(ctx, V);

/* ─────────────────────────────────────────────────────────
 * PROJECT STORIES. Each draw(k, t) gets time t in seconds since hover
 * began (0 at rest) and returns the accent box for the selection overlay.
 * ───────────────────────────────────────────────────────── */

/* Contract Sign-up
 *    0ms   rest: order form with line items, unsigned line, card tilted beside it
 *  150ms   signature writes itself across the line
 *  750ms   card straightens and slides onto the form
 * 1000ms   share link sends a dashed arc to the card (the finance hand-off)
 * 1300ms   SIGNED stamp pops in                                        */
const CONTRACT_T = { sign: 150, signDur: 600, card: 750, cardDur: 450, link: 1000, linkDur: 400, stamp: 1300, stampDur: 350, end: 1.8 };
function drawContract(k, t) {
  const T = CONTRACT_T, c = k.ctx;
  k.plate(104, 26, 156, 230, 6); k.rect(104, 26, 156, 230, 6, { fill: 'paper' });
  k.rect(120, 42, 22, 22, 4); k.detail(150, 48, 210, 48); k.detail(150, 58, 190, 58);
  k.text('Order form', 120, 82, { size: 8, alpha: .6 });
  for (let i = 0; i < 4; i++) { const y = 100 + i * 16; k.detail(120, y, 120 + [64, 52, 70, 44][i], y); k.detail(214, y, 244, y); }
  k.line(120, 166, 244, 166, { w: V.weight * .7 });
  k.text('Total', 120, 180, { size: 8 }); k.line(212, 180, 244, 180, { w: V.weight * 1.6 });
  k.text('×', 120, 220, { size: 11, weight: 400, track: false }); k.line(130, 226, 214, 226);
  k.path([[134, 222], [142, 208], [150, 220], [158, 204], [168, 218], [176, 210], [186, 216], [198, 212], [208, 214]], out(seg(t, T.sign, T.signDur)), { w: V.weight * 1.1 });
  // link chain icon, top right of the form
  k.rect(226, 40, 16, 9, 4.5, { w: V.weight * .8 }); k.rect(234, 46, 16, 9, 4.5, { w: V.weight * .8, fill: 'paper' });
  // card: tilted at rest, slides onto the form
  // the card arcs onto the form: x/y move, it rises at the midpoint (sine lift), grows a little
  // and its plate deepens as if lifting off the page, then settles (arc paths + multiple properties)
  const raw = seg(t, T.card, T.cardDur), cp = back(raw), cx = lerp(274, 228, cp), arcLift = Math.sin(io(raw) * Math.PI);
  const cy = lerp(186, 170, cp) - arcLift * 26, rot = lerp(0.18, 0, cp), lift = 1 + arcLift * 0.07;
  const lp = out(seg(t, T.link, T.linkDur));
  if (lp > 0) {   // curved hand-off from the share link to the card
    const a = [250, 50], c1 = [322, 52], c2 = [330, 120], b = [cx + 60, cy - 2], arc = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24, m = 1 - u; arc.push([m * m * m * a[0] + 3 * m * m * u * c1[0] + 3 * m * u * u * c2[0] + u * u * u * b[0], m * m * m * a[1] + 3 * m * m * u * c1[1] + 3 * m * u * u * c2[1] + u * u * u * b[1]]); }
    k.path(arc, lp, { dash: [3, 4], color: k.acc, w: V.weight * .8 });
  }
  c.save(); c.translate(cx + 55, cy + 36); c.rotate(rot); c.scale(lift, lift); c.translate(-55, -36);
  const plateWas = V.plate; V.plate = plateWas * (1 + arcLift * 1.6); k.plate(0, 0, 110, 72, 9); V.plate = plateWas;
  k.rect(0, 0, 110, 72, 9, { fill: 'accent', color: k.acc });
  k.rect(12, 16, 18, 13, 3, { fill: 'paper', stroke: false, alpha: .9 });
  for (let i = 0; i < 4; i++) k.line(12 + i * 23, 50, 28 + i * 23, 50, { color: k.paper, w: 2 });
  c.restore();
  const sp = seg(t, T.stamp, T.stampDur);
  if (sp > 0) { c.save(); c.translate(184, 136); c.rotate(-0.16); c.scale(lerp(1.6, 1, out(sp)), lerp(1.6, 1, out(sp))); k.rect(-34, -11, 68, 22, 3, { color: k.acc, w: 1.6, alpha: out(sp) }); k.text('Signed', 0, 0, { size: 10, align: 'center', color: k.acc, weight: 600, alpha: out(sp) }); c.restore(); }
  return { x: cx, y: cy, w: 110, h: 72, label: 'Payment', end: T.end };
}

/* Supplier Experience
 *    0ms   rest: buyer at the center, suppliers on two dashed orbits
 *    0ms   orbits start turning slowly (outer faster than inner)
 *  200ms   pulses run out along each spoke (staggered 60ms)
 *  700ms   the accent supplier's task card ticks its three tasks (staggered 250ms) */
const SUPPLIER_T = { pulse: 200, pulseDur: 500, pulseStagger: 60, tasks: 700, taskStagger: 250, end: 1.8 };
function drawSupplier(k, t) {
  const T = SUPPLIER_T, cx = 190, cy = 150;
  const spin = REDUCED ? 0 : t * 0.35;
  k.circle(cx, cy, 72, { dash: [2, 5], w: .9, alpha: .5 }); k.circle(cx, cy, 122, { dash: [2, 5], w: .9, alpha: .5 });
  const nodes = [
    [72, -1.9, 9], [72, -0.6, 12], [72, 0.9, 10], [72, 2.4, 13],
    [122, -2.6, 7], [122, -1.3, 9], [122, 0.25, 8], [122, 1.6, 10], [122, 3.0, 7],
  ].map(([r, a, s], i) => { const ang = a + spin * (r > 100 ? 1 : -0.6); return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r * 0.82, s, i }; });
  nodes.forEach(n => k.detail(cx, cy, n.x, n.y));
  nodes.forEach(n => { const p = out(seg(t, T.pulse + n.i * T.pulseStagger, T.pulseDur)); if (p > 0 && p < 1) k.circle(lerp(cx, n.x, p), lerp(cy, n.y, p), 2.4, { fill: 'accent', stroke: false }); });
  nodes.forEach(n => k.circle(n.x, n.y, n.s, { fill: 'paper' }));
  // buyer org: building in the middle
  k.plate(cx - 22, cy - 22, 44, 44, 6); k.rect(cx - 22, cy - 22, 44, 44, 6, { fill: 'paper' });
  for (let r = 0; r < 2; r++) for (let q = 0; q < 3; q++) k.rect(cx - 13 + q * 9, cy - 12 + r * 10, 5, 6, 1, { w: .8 });
  k.rect(cx - 4, cy + 8, 8, 14, 1, { w: .8 });
  // the accent supplier and its task card
  const a = { x: cx + Math.cos(0.55 + spin * 0.4) * 140, y: cy + Math.sin(0.55 + spin * 0.4) * 96 };
  k.detail(cx, cy, a.x, a.y, { color: k.acc, alpha: .8 });
  k.circle(a.x, a.y, 16, { fill: 'accent', color: k.acc });
  const bx = a.x - 112, by = a.y + 22;
  k.plate(bx, by, 96, 50, 6); k.rect(bx, by, 96, 50, 6, { fill: 'paper' });
  for (let i = 0; i < 3; i++) {
    const y = by + 12 + i * 13, done = seg(t, T.tasks + i * T.taskStagger, 200);
    k.rect(bx + 9, y - 4, 8, 8, 2, { w: .9, fill: done > .5 ? 'accent' : 'paper', color: done > .5 ? k.acc : k.ink });
    if (done > 0) k.path([[bx + 10.5, y], [bx + 12.5, y + 2], [bx + 15.5, y - 2]], done, { color: k.paper, w: 1.3 });
    k.detail(bx + 23, y, bx + 23 + [52, 40, 60][i], y, { alpha: done > .5 ? .15 : V.detail });
  }
  return { x: a.x - 16, y: a.y - 16, w: 32, h: 32, label: 'Supplier', end: T.end };
}

/* HRIS Buying Study
 *    0ms   rest: a six-stage journey, stage 04 (trial) ringed, 12 interview ticks
 *  100ms   a buyer dot travels the path from stage 01
 *  900ms   it reaches the trial stage and stops; a ripple ring spreads
 * 1100ms   three interview quotes pop up over stages 02, 05, 06 (staggered 150ms) */
const HRIS_T = { travel: 100, travelDur: 800, ripple: 900, rippleDur: 700, quotes: 1100, quoteStagger: 150, end: 1.9 };
function drawHris(k, t) {
  const T = HRIS_T;
  const stages = [[40, 210], [102, 186], [160, 200], [222, 150], [282, 166], [344, 116]];
  k.detail(30, 244, 370, 244, { dash: [2, 4] });
  const curve = []; for (let i = 0; i < stages.length - 1; i++) for (let s = 0; s <= 10; s++) { const f = s / 10, e = io(f); curve.push([lerp(stages[i][0], stages[i + 1][0], f), lerp(stages[i][1], stages[i + 1][1], e)]); }
  k.path(curve, 1);
  stages.forEach(([x, y], i) => { if (i !== 3) k.circle(x, y, 7, { fill: 'paper' }); k.text('0' + (i + 1), x, 232, { size: 8, align: 'center', alpha: .55 }); k.detail(x, y + 9, x, 244, { dash: [1, 3], alpha: .25 }); });
  // trial stage
  const rp = seg(t, T.ripple, T.rippleDur);
  if (rp > 0 && rp < 1) k.circle(222, 150, lerp(14, 42, out(rp)), { color: k.acc, alpha: 1 - rp, w: 1.2 });
  k.circle(222, 150, 16, { fill: 'accent', color: k.acc }); k.text('Trial', 222, 124, { size: 8, align: 'center', color: k.acc, weight: 600 });
  // 12 interviews as tally marks
  for (let g = 0; g < 3; g++) { const x0 = 36 + g * 30; for (let i = 0; i < 4; i++) k.line(x0 + i * 5, 38, x0 + i * 5, 54, { w: 1.1 }); if (g < 2 || true) k.line(x0 - 3, 52, x0 + 19, 40, { w: 1.1, alpha: g < 3 ? 1 : 0 }); }
  k.text('12 interviews', 36, 68, { size: 8, alpha: .6 });
  // traveler
  const tp = io(seg(t, T.travel, T.travelDur));
  if (tp > 0) { const upto = Math.floor(tp * (curve.length - 1) * 0.6); const q = curve[Math.min(curve.length - 1, Math.max(0, upto))]; if (tp < 1) k.circle(q[0], q[1], 4, { fill: 'ink', stroke: false }); }
  // quotes
  [[102, 186], [282, 166], [344, 116]].forEach(([x, y], i) => {
    const p = back(seg(t, T.quotes + i * T.quoteStagger, 300)); if (p <= 0) return;
    const c = k.ctx; c.save(); c.translate(x, y - 34); c.scale(p, p);
    k.rect(-22, -12, 44, 22, 8, { fill: 'paper', w: 1 }); k.line(-6, 10, -2, 16, { w: 1 });
    [-8, 0, 8].forEach(dx => k.circle(dx, -1, 1.6, { fill: 'ink', stroke: false })); c.restore();
  });
  return { x: 206, y: 134, w: 32, h: 32, label: 'Trial', end: T.end };
}

/* Checkout
 *    0ms   rest: three-step stepper, empty form, Pay button
 *    0ms   cursor glides in from the lower right
 *  300ms   fields fill as if typed (staggered 220ms)
 *  950ms   stepper progress line fills to step 3
 * 1200ms   cursor presses Pay (button dips), "Pay" becomes ✓              */
const CHECKOUT_T = { cursorIn: 0, cursorDur: 1200, fields: 300, fieldStagger: 220, fieldDur: 260, stepper: 950, stepperDur: 300, press: 1200, pressDur: 220, end: 1.9 };
function drawCheckout(k, t) {
  const T = CHECKOUT_T;
  // stepper
  const sp = out(seg(t, T.stepper, T.stepperDur));
  k.line(66, 70, 66, 210); k.line(66, 70, 66, lerp(140, 210, sp), { color: k.acc, w: V.weight * 1.4 });
  [70, 140, 210].forEach((y, i) => { const done = i < 2 || sp >= 1; k.circle(66, y, 11, { fill: done ? 'accent' : 'paper', color: done ? k.acc : k.ink }); k.text(String(i + 1), 66, y + .5, { size: 9, align: 'center', color: done ? k.paper : k.ink, weight: 600, track: false }); });
  // form card
  k.plate(104, 34, 262, 232, 8); k.rect(104, 34, 262, 232, 8, { fill: 'paper' });
  k.text('Payment', 122, 54, { size: 8, alpha: .6 });
  const fields = [[122, 68, 226], [122, 112, 226], [122, 156, 106], [242, 156, 106]];
  fields.forEach(([x, y, w], i) => {
    k.detail(x, y, x + 34, y, { alpha: .3 });
    k.rect(x, y + 8, w, 26, 4, { w: 1 });
    const f = seg(t, T.fields + i * T.fieldStagger, T.fieldDur);
    if (f > 0) k.line(x + 10, y + 21, x + 10 + (w - 40) * [0.7, 0.85, 0.5, 0.4][i] * f, y + 21, { w: 2 });
  });
  k.rect(316, 125, 18, 12, 2, { w: .8 }); // card icon in the number field
  // pay button
  const pr = seg(t, T.press, T.pressDur), dip = pr > 0 && pr < 1 ? Math.sin(pr * Math.PI) * 0.04 : 0, c = k.ctx;
  c.save(); c.translate(235, 222); c.scale(1 - dip, 1 - dip);
  k.rect(-113, -17, 226, 34, 6, { fill: 'accent', color: k.acc });
  if (pr < 0.5) k.text('Pay', 0, 0.5, { size: 10, align: 'center', color: k.paper, weight: 600 });
  else k.path([[-7, 0], [-2, 5], [8, -5]], out((pr - .5) * 2), { color: k.paper, w: 2 });
  c.restore();
  // lock
  k.rect(332, 46, 12, 9, 2, { w: .9 }); k.ctx.beginPath(); k.ctx.arc(338, 46, 4, Math.PI, 0); k.ctx.lineWidth = .9; k.ctx.strokeStyle = k.ink; k.ctx.stroke();
  // cursor
  const cp = io(seg(t, T.cursorIn, T.cursorDur));
  const path = [[392, 300], [300, 150], [250, 130], [262, 226]];
  const seg3 = cp * 3, si = Math.min(2, Math.floor(seg3)), f = seg3 - si;
  const ef = io(f), hop = Math.hypot(path[si + 1][0] - path[si][0], path[si + 1][1] - path[si][1]) * 0.18;
  const px = lerp(path[si][0], path[si + 1][0], ef), py = lerp(path[si][1], path[si + 1][1], ef) - Math.sin(ef * Math.PI) * hop;   // each hop curves
  k.cursor(px, py, 1, t > 0 ? Math.min(1, t * 6) : 0);
  return { x: 122, y: 205, w: 226, h: 34, label: 'Pay', end: T.end };
}

/* Trial Experience
 *    0ms   rest: product window, the trial hub tucked under the title bar as a tab
 *  100ms   hub drawer drops open (overshoots slightly)
 *  600ms   the user's question bubble appears
 *  900ms   agent typing dots, then its reply grows line by line
 * 1500ms   a spark twinkles on the agent avatar                       */
const TRIAL_T = { drawer: 100, drawerDur: 500, ask: 600, typing: 900, reply: 1150, replyDur: 450, spark: 1500, end: 1.9 };
function drawTrial(k, t) {
  const T = TRIAL_T;
  k.plate(40, 28, 320, 240, 10); k.rect(40, 28, 320, 240, 10, { fill: 'paper' });
  k.line(40, 52, 360, 52, { w: 1 }); [54, 64, 74].forEach(x => k.circle(x, 40, 3, { w: .9 }));
  k.line(102, 52, 102, 268, { w: 1 });
  for (let i = 0; i < 6; i++) k.detail(54, 72 + i * 16, 54 + [36, 28, 34, 24, 30, 26][i], 72 + i * 16);
  // content behind the drawer
  k.rect(118, 170, 104, 58, 5, { w: 1 }); k.rect(234, 170, 110, 58, 5, { w: 1 });
  k.detail(128, 186, 190, 186); k.detail(128, 198, 170, 198); k.path([[244, 214], [262, 200], [280, 208], [300, 190], [332, 196]], 1, { w: 1 });
  k.detail(118, 244, 300, 244); k.detail(118, 256, 250, 256);
  // drawer
  const dp = back(seg(t, T.drawer, T.drawerDur)), h = lerp(18, 104, dp);
  k.rect(116, 52, 230, h, [0, 0, 8, 8], { fill: 'accent', color: k.acc });
  k.text('Trial hub', 128, 52 + Math.min(h, 104) - 9, { size: 8, color: k.paper, weight: 600 });
  if (h > 40) {
    const c = k.ctx; c.save(); c.beginPath(); c.rect(116, 52, 230, h); c.clip();
    const ask = back(seg(t, T.ask, 260)); if (ask > 0) { c.save(); c.translate(328, 70); c.scale(ask, ask); k.rect(-82, -9, 82, 18, 9, { fill: 'paper', stroke: false }); k.detail(-72, 0, -16, 0, { alpha: .5 }); c.restore(); }
    k.circle(134, 96, 9, { fill: 'paper', stroke: false });
    const sk = seg(t, T.spark, 500); if (sk > 0) { const s = Math.sin(sk * Math.PI) * 6; k.line(134 - s, 96, 134 + s, 96, { color: k.acc, w: 1.4 }); k.line(134, 96 - s, 134, 96 + s, { color: k.acc, w: 1.4 }); }
    const typing = seg(t, T.typing, 250), rp = out(seg(t, T.reply, T.replyDur));
    if (typing > 0 && rp <= 0) { k.rect(150, 87, 40, 18, 9, { fill: 'paper', stroke: false }); [160, 170, 180].forEach((x, i) => k.circle(x, 96, 1.6 + Math.max(0, Math.sin(t * 9 - i)) * .8, { fill: 'ink', stroke: false })); }
    if (rp > 0) { k.rect(150, 87, lerp(40, 150, rp), lerp(18, 44, rp), 9, { fill: 'paper', stroke: false }); if (rp > .4) { k.detail(160, 98, 160 + 118 * rp, 98, { alpha: .5 }); k.detail(160, 110, 160 + 80 * rp, 110, { alpha: .5 }); } }
    c.restore();
  }
  return { x: 116, y: 52, w: 230, h, label: 'Trial hub', end: T.end };
}


const DRAW = { contract: drawContract, supplier: drawSupplier, hris: drawHris, checkout: drawCheckout, trial: drawTrial };

const items = [];
export function mountIllustrations(root = document) {
  root.querySelectorAll('canvas[data-illustration]').forEach((canvas) => {
    const draw = DRAW[canvas.dataset.illustration]; if (!draw) return;
    const card = canvas.closest('[data-card]') || canvas;
    const it = { canvas, draw, t: 0, hovering: false, still: canvas.hasAttribute('data-still'), visible: true };
    card.addEventListener('pointerenter', () => { it.hovering = true; if (REDUCED) it.t = 5; });
    card.addEventListener('pointerleave', () => { if (card.hasAttribute('data-autoplay')) return; it.hovering = false; if (REDUCED) it.t = 0; });
    card.addEventListener('focusin', () => { it.hovering = true; if (REDUCED) it.t = 5; });
    card.addEventListener('focusout', () => { if (card.hasAttribute('data-autoplay')) return; it.hovering = false; if (REDUCED) it.t = 0; });
    new IntersectionObserver(([e]) => {
      it.visible = e.isIntersecting;
      if (e.isIntersecting && card.hasAttribute('data-autoplay') && !it.played) { it.played = true; setTimeout(() => { it.hovering = true; if (REDUCED) it.t = 5; }, 500); }
    }).observe(canvas);
    items.push(it);
  });
  if (items.length && !mountIllustrations.running) { mountIllustrations.running = true; requestAnimationFrame(loop); }
}

function render(it, dt) {
  const c = it.canvas, dpr = Math.min(devicePixelRatio, 2), cw = c.clientWidth, ch = c.clientHeight;
  if (!cw || !ch) return;
  if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); it.dirty = true; }
  const before = it.t;
  if (!REDUCED) it.t = it.hovering ? it.t + dt * V.hover.speed : Math.max(0, it.t - dt * 2 * V.hover.speed);
  const animating = it.t !== before || it.t > 0 && it.draw === drawSupplier || it.draw === drawTrial && it.t > 0;
  if (!animating && !it.dirty) return;     // idle cards don't redraw
  it.dirty = false;
  const ctx = c.getContext('2d'), s = Math.min(cw / 400, ch / 300) * V.card.scale, ox = (cw - 400 * s) / 2, oy = (ch - 300 * s) / 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = V.paper; ctx.fillRect(0, 0, cw, ch);
  if (V.card.grid) {
    ctx.strokeStyle = V.ink; ctx.globalAlpha = V.card.gridOpacity * .22; ctx.lineWidth = 1; ctx.beginPath(); const g = V.card.gridSize;
    for (let x = ox % g; x < cw; x += g) { ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, ch); }
    for (let y = oy % g; y < ch; y += g) { ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(cw, Math.round(y) + .5); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.translate(ox, oy); ctx.scale(s, s);
  it.draw(kit(ctx), it.t);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  for (const it of items) if (it.visible) render(it, dt);
  requestAnimationFrame(loop);
}
document.fonts?.ready.then(() => items.forEach(it => { it.dirty = true; }));
addEventListener('resize', () => items.forEach(it => { it.dirty = true; }));


/* ─────────────────────────────────────────────────────────
 * HOW-I-WORK GLYPHS: 100 × 100 line drawings in the same system, played on hover
 *   research   a magnifier sweeps across a page; lines under the lens turn blue
 *   build      a code window types  < / >  with a blinking caret
 *   evidence   a balance tips toward the side with the check
 * ───────────────────────────────────────────────────────── */
const GLYPHS = {
  research(k, t) {
    const sweep = Math.min(1, t / 1.1), e = 1 - Math.pow(1 - sweep, 3);
    k.rect(18, 14, 52, 66, 4, { fill: 'paper' });
    const lx = 40 + Math.sin(e * Math.PI) * 6 + e * 18, ly = 30 + e * 28;
    [26, 36, 46, 56, 66].forEach((y, i) => {
      const lit = Math.abs(y - ly) < 9 && t > 0;
      k.line(26, y, 26 + [36, 28, 34, 22, 30][i], y, { w: lit ? 2 : 1.2, color: lit ? k.acc : k.ink, alpha: lit ? 1 : .45 });
    });
    k.circle(lx, ly, 13, { fill: 'paper', alpha: .001, w: 2 }); k.circle(lx, ly, 13, { w: 2 });
    k.line(lx + 9.5, ly + 9.5, lx + 22, ly + 22, { w: 3.5 });
  },
  build(k, t) {
    k.rect(10, 18, 80, 62, 6, { fill: 'paper' }); k.line(10, 30, 90, 30, { w: 1.2 });
    [17, 24, 31].forEach(x => k.circle(x, 24, 1.8, { fill: 'ink', stroke: false }));
    const chars = ['<', '/', '>'], shown = t > 0 ? Math.min(3, Math.floor(t / 0.22)) : 3;
    const typed = chars.slice(0, shown).join('');
    k.ctx.save(); k.ctx.font = '600 24px "Instrument Sans", sans-serif'; k.ctx.fillStyle = k.acc; k.ctx.textBaseline = 'middle';
    const w = k.ctx.measureText(typed).width; k.ctx.fillText(typed, 26, 56);
    if (t > 0 && Math.floor(t * 2.2) % 2 === 0 || t === 0) k.line(28 + w, 46, 28 + w, 66, { w: 2 });
    k.ctx.restore();
  },
  evidence(k, t) {
    const p = Math.min(1, t / 0.9), tip = t > 0 ? Math.sin(p * Math.PI * 1.5) * Math.exp(-p * 1.2) * 0.16 + 0.12 * (1 - Math.exp(-p * 4)) : 0;
    k.line(50, 22, 50, 84, { w: 1.6 }); k.line(34, 84, 66, 84, { w: 1.6 });
    k.ctx.save(); k.ctx.translate(50, 28); k.ctx.rotate(tip);
    k.line(-36, 0, 36, 0, { w: 1.8 });
    [-1, 1].forEach(sd => { const x = sd * 32; k.line(x, 0, x - 9, 24, { w: 1 }); k.line(x, 0, x + 9, 24, { w: 1 });
      k.ctx.save(); k.ctx.translate(x, 24); k.ctx.rotate(-tip); k.ctx.beginPath(); k.ctx.moveTo(-12, 0); k.ctx.quadraticCurveTo(0, 10, 12, 0); k.ctx.closePath();
      k.ctx.fillStyle = sd > 0 ? k.acc : k.paper; k.ctx.fill(); k.ctx.strokeStyle = sd > 0 ? k.acc : k.ink; k.ctx.lineWidth = 1.5; k.ctx.stroke();
      if (sd > 0) { k.path([[-4, 2], [-1, 5], [5, -1]], 1, { color: k.paper, w: 1.6 }); } else { k.line(-4, 3, 4, 3, { w: 1.4, alpha: .5 }); }
      k.ctx.restore(); });
    k.ctx.restore();
    k.circle(50, 28, 2.4, { fill: 'ink', stroke: false });
  },
};
export function mountGlyphs(root = document) {
  root.querySelectorAll('canvas[data-glyph]').forEach((canvas) => {
    const draw = GLYPHS[canvas.dataset.glyph]; if (!draw) return;
    const card = canvas.closest('[data-card]') || canvas;
    const g = { canvas, t: 0, hovering: false };
    card.addEventListener('pointerenter', () => { g.hovering = true; if (REDUCED) g.t = 3; });
    card.addEventListener('pointerleave', () => { g.hovering = false; g.t = 0; });
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (g.hovering && !REDUCED) g.t += dt;
      const dpr = Math.min(devicePixelRatio, 2), w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      ctx.scale(w / 100, h / 100); draw(kit(ctx), g.t);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
