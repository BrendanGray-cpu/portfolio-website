/* ─────────────────────────────────────────────────────────
 * DRAW KIT: the shared line-illustration language (Work cards, the Home intro).
 * One ink weight for objects, a lighter one for detail, paper fills so overlaps
 * occlude, one blue accent, a small offset plate for depth.
 * makeKit(ctx, V) draws in whatever coordinate space ctx is set up for.
 * ───────────────────────────────────────────────────────── */

// ---------- easing + timeline helpers ----------
export const clamp = (v) => Math.max(0, Math.min(1, v));
export const out = (v) => 1 - Math.pow(1 - v, 3);                                   // ease out
export const io = (v) => v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;  // ease in-out
export const back = (v) => { const c = 1.7; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };
export const seg = (t, at, dur) => clamp((t - at / 1000) / (dur / 1000));          // 0..1 progress of a stage
export const lerp = (a, b, k) => a + (b - a) * k;

// ---------- drawing kit (all in a 400 × 300 box) ----------
export function makeKit(ctx, V) {
  const ink = V.ink, acc = V.accent, paper = V.paper, W = V.weight;
  const k = {
    ink, acc, paper,
    line(x1, y1, x2, y2, o = {}) { ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = o.color || ink; ctx.lineWidth = o.w ?? W; ctx.lineCap = 'round'; if (o.dash) ctx.setLineDash(o.dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); },
    detail(x1, y1, x2, y2, o = {}) { k.line(x1, y1, x2, y2, { w: W * 0.7, alpha: V.detail, ...o }); },
    rect(x, y, w, h, r, o = {}) {
      ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
      if (o.fill) { ctx.fillStyle = o.fill === 'accent' ? acc : o.fill === 'ink' ? ink : o.fill === 'paper' ? paper : o.fill; ctx.fill(); }
      if (o.stroke !== false) { ctx.strokeStyle = o.color || ink; ctx.lineWidth = o.w ?? W; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
      ctx.restore();
    },
    plate(x, y, w, h, r) { if (V.plate > 0) k.rect(x + V.plate, y + V.plate, w, h, r, { fill: 'paper', w: W * 0.7, alpha: 0.9 }); },
    circle(cx, cy, r, o = {}) {
      ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.01, r), 0, Math.PI * 2);
      if (o.fill) { ctx.fillStyle = o.fill === 'accent' ? acc : o.fill === 'ink' ? ink : (typeof o.fill === 'string' && /^(#|rgb)/.test(o.fill)) ? o.fill : paper; ctx.fill(); }
      if (o.stroke !== false) { ctx.strokeStyle = o.color || ink; ctx.lineWidth = o.w ?? W; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
      ctx.restore();
    },
    // draw a polyline up to fraction p of its length (for "drawing itself" strokes)
    path(pts, p = 1, o = {}) {
      if (p <= 0) return; const segs = []; let L = 0;
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); L += l; }
      let left = L * p; ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = o.color || ink; ctx.lineWidth = o.w ?? W; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); ctx.moveTo(...pts[0]);
      for (let i = 1; i < pts.length && left > 0; i++) { const f = Math.min(1, left / segs[i - 1]); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); left -= segs[i - 1]; }
      ctx.stroke(); ctx.restore();
    },
    text(s, x, y, o = {}) { ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = o.color || ink; ctx.font = `${o.weight || 500} ${(o.size || 9) + 1}px "Instrument Sans", ui-sans-serif, sans-serif`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.restore(); },
    // pointer arrow, tip at (x, y)
    cursor(x, y, s = 1, alpha = 1) { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.lineTo(4.5, 12); ctx.lineTo(7.5, 18.5); ctx.lineTo(10, 17.3); ctx.lineTo(7.2, 11); ctx.lineTo(12.5, 11); ctx.closePath(); ctx.fillStyle = paper; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); },
    ctx,
  };
  return k;
}

