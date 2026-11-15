/* ─────────────────────────────────────────────────────────
 * SITE BEHAVIOR
 *
 * Nav dot        one blue dot under the current page; glides to the hovered item on
 *                a small arc (spring + sine lift); carried across pages by a view transition
 * Reveal         sections fade up once, chained 60ms apart; visible without JS
 * Recommendations  "Read the full recommendation" unfolds the full text (one open at a time)
 * Compare        before/after: drag or arrow keys; nudges once when first seen
 * Tilt           Fun Zone media lean toward the cursor (map range, ±4°)
 * Carousel       Taste exercises: scroll-snap, prev/next, arrow keys
 * Clips          case study recordings play muted while half on screen
 * Video          the sizzle reel plays muted while on screen; click for sound
 * Settle         case study hero screenshot scales 1.04 → 1 as it scrolls in
 * Copy           the email button copies and confirms in place
 * ───────────────────────────────────────────────────────── */
import { mountIllustrations, mountGlyphs } from './illustrations.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(hover: none)').matches;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mapRange = (v, a, b, c, d) => c + clamp((v - a) / (b - a)) * (d - c);

/* ---------- nav dot ---------- */
const DOT = { stiffness: 0.16, damping: 0.62, lift: 4 };
const nav = document.querySelector('.nav');
const dot = nav?.querySelector('.nav-dot');
if (nav && dot) {
  const items = [...nav.querySelectorAll('a')];
  const home = items.find(a => a.getAttribute('aria-current') === 'page') || items[0];
  const xFor = (a) => a.offsetLeft + a.offsetWidth / 2 - (a.classList.contains('ext') ? 6 : 0);
  let x = xFor(home), v = 0, target = x, from = x, raf = 0;
  const place = () => { const prog = clamp(Math.abs(x - from) / Math.max(1, Math.abs(target - from))); dot.style.transform = `translate(${x}px, ${-Math.sin(prog * Math.PI) * DOT.lift}px)`; };
  const step = () => {
    v = (v + (target - x) * DOT.stiffness) * DOT.damping; x += v; place();
    if (Math.abs(target - x) > 0.1 || Math.abs(v) > 0.1) raf = requestAnimationFrame(step); else { x = target; place(); raf = 0; }
  };
  const go = (a) => { from = x; target = xFor(a); if (REDUCED) { x = target; place(); return; } if (!raf) raf = requestAnimationFrame(step); };
  place();
  items.forEach(a => { a.addEventListener('pointerenter', () => go(a)); a.addEventListener('focus', () => go(a)); });
  nav.addEventListener('pointerleave', () => go(home));
  nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget)) go(home); });
  const reset = () => { x = target = from = xFor(home); place(); };
  addEventListener('resize', reset); document.fonts?.ready.then(reset);
}

/* ---------- reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

/* ---------- illustrations ---------- */
mountIllustrations();
mountGlyphs();

/* ---------- recommendations ---------- */
const recs = [...document.querySelectorAll('.rec')];
recs.forEach((rec) => {
  const btn = rec.querySelector('.toggle'), lbl = btn.querySelector('.lbl');
  const set = (open) => { rec.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); lbl.textContent = open ? 'Show less' : 'Read the full recommendation'; };
  btn.addEventListener('click', () => {
    const open = !rec.classList.contains('open');
    recs.forEach(r => { if (r !== rec && r.classList.contains('open')) { r.classList.remove('open'); r.querySelector('.toggle').setAttribute('aria-expanded', 'false'); r.querySelector('.lbl').textContent = 'Read the full recommendation'; } });
    set(open);
  });
});

/* ---------- before / after ---------- */
document.querySelectorAll('[data-compare]').forEach((frame) => {
  let pos = 50, dragging = false;
  frame.tabIndex = 0; frame.setAttribute('role', 'slider'); frame.setAttribute('aria-label', 'Before and after');
  frame.setAttribute('aria-valuemin', '0'); frame.setAttribute('aria-valuemax', '100');
  const set = (p) => { pos = clamp(p, 2, 98); frame.style.setProperty('--pos', pos + '%'); frame.setAttribute('aria-valuenow', Math.round(pos)); };
  const fromEvent = (e) => { const r = frame.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
  frame.addEventListener('pointerdown', (e) => { dragging = true; try { frame.setPointerCapture(e.pointerId); } catch {} fromEvent(e); });
  frame.addEventListener('pointermove', (e) => { if (dragging || (!COARSE && e.buttons === 0 && frame.matches(':hover') && frame.dataset.follow)) fromEvent(e); });
  frame.addEventListener('pointerup', () => { dragging = false; });
  frame.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { set(pos - 5); e.preventDefault(); } if (e.key === 'ArrowRight') { set(pos + 5); e.preventDefault(); } });
  set(50);
  if (!REDUCED) {
    const hint = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return; hint.disconnect();
      const t0 = performance.now() + 400;
      const tick = (now) => { const t = (now - t0) / 1100; if (dragging) return; if (t < 0) return requestAnimationFrame(tick); if (t >= 1) { set(50); return; } set(50 + Math.sin(t * Math.PI * 2) * 8 * (1 - t)); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    hint.observe(frame);
  }
});

/* ---------- tilt ---------- */
if (!COARSE && !REDUCED) document.querySelectorAll('.fun .tilt').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.classList.add('active');
    el.style.setProperty('--ry', mapRange(e.clientX, r.left, r.right, -4, 4).toFixed(2) + 'deg');
    el.style.setProperty('--rx', mapRange(e.clientY, r.top, r.bottom, 3, -3).toFixed(2) + 'deg');
  });
  el.addEventListener('pointerleave', () => { el.classList.remove('active'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
});

/* ---------- carousel ---------- */
document.querySelectorAll('.carousel').forEach((c) => {
  const track = c.querySelector('.track'), slides = [...track.children];
  const prev = c.querySelector('.prev'), next = c.querySelector('.next-btn'), out = c.querySelector('.count .i');
  let cur = 0;   // the slide we're on or heading to, so quick clicks stack instead of re-reading a mid-scroll position
  const idx = () => cur;
  const go = (i) => { cur = clamp(i, 0, slides.length - 1); track.scrollTo({ left: cur * track.clientWidth, behavior: REDUCED ? 'auto' : 'smooth' }); sync(); };
  const sync = () => { const i = cur; out.textContent = i + 1; prev.disabled = i === 0; next.disabled = i === slides.length - 1; slides.forEach((s, j) => s.toggleAttribute('inert', j !== i)); };
  prev.addEventListener('click', () => go(idx() - 1));
  next.addEventListener('click', () => go(idx() + 1));
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { go(idx() - 1); e.preventDefault(); } if (e.key === 'ArrowRight') { go(idx() + 1); e.preventDefault(); } });
  let t; track.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { cur = Math.round(track.scrollLeft / track.clientWidth); sync(); }, 90); }, { passive: true });
  addEventListener('resize', () => go(idx()));
  sync();
});

/* ---------- case study clips ---------- */
// Play only while at least half on screen, from where they left off; reduced motion gets native controls instead.
document.querySelectorAll('.clip video, .clip-hero video, .fun video.loop').forEach((v) => {
  if (REDUCED) { if (!v.classList.contains('loop')) v.controls = true; return; }
  new IntersectionObserver(([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }, { threshold: 0.5 }).observe(v);
});

/* ---------- video ---------- */
document.querySelectorAll('.fun .video').forEach((wrap) => {
  const video = wrap.querySelector('video'), btn = wrap.querySelector('.sound');
  if (!REDUCED) new IntersectionObserver(([e]) => { e.isIntersecting ? video.play().catch(() => {}) : video.pause(); }, { threshold: 0.35 }).observe(video);
  const toggle = () => {
    video.muted = !video.muted; if (!video.muted) video.play().catch(() => {});
    btn.textContent = video.muted ? 'Sound on' : 'Sound off'; btn.setAttribute('aria-pressed', String(!video.muted));
  };
  btn.addEventListener('click', toggle); video.addEventListener('click', toggle);
});

/* ---------- settle ---------- */
const shot = document.querySelector('.shot.settle img, .shot.settle video');
if (shot && !REDUCED) {
  const fig = shot.parentElement;
  const update = () => { const r = fig.getBoundingClientRect(); shot.style.transform = `scale(${mapRange(r.top, innerHeight, innerHeight * 0.25, 1.05, 1).toFixed(4)})`; };
  addEventListener('scroll', update, { passive: true }); update();
}

/* ---------- copy email ---------- */
document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.copy); } catch { location.href = 'mailto:' + btn.dataset.copy; return; }
    btn.classList.add('done'); setTimeout(() => btn.classList.remove('done'), 1800);
  });
});
