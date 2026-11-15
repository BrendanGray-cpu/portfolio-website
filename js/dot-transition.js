/* ─────────────────────────────────────────────────────────
 * DOT TRANSITION  (illustration → project UI, in the hero's dot language)
 *
 *   0          the illustration, as drawn
 *   fade in    the illustration hands over to a dot copy of itself (same place, same ink)
 *   travel     each dot leaves on a curled, mostly sideways path, swelling as it goes;
 *              neighbours share a direction (a smooth flow field), so dots streak in clumps
 *              like the scrambled face instead of spreading like snow
 *              (a few become big dark dots, a few flash the accent blue), then lands on
 *              a halftone of the project's UI: darker UI, bigger dot
 *   video      the halftone crossfades into the real video (or still) and it plays
 *
 * Everything is deterministic in progress p (0 → 1), so leaving plays it backwards.
 * Two dot sets are sampled each time the transition starts from either end: the illustration
 * canvas (line art: a cell's darkest pixel) and the UI (a cell's average ink, with colour counted
 * as ink). The UI is the video's current frame, so the dots match where it paused.
 * ───────────────────────────────────────────────────────── */

export const DEFAULTS = {
  grid: { step: 3, inkThreshold: 0.2, uiThreshold: 0.08, uiGamma: 0.7, paperDots: 0.15, jitter: 0.45 },
  dots: { sizeMin: 0.9, sizeMax: 3.6, bigChance: 0.05, bigSize: 11, accentChance: 0.04, grays: 6 },
  motion: { scatter: 0.22, curl: 0.35, horizontal: 3, coherence: 0.75, bands: 0.18, wobble: 0.18, stagger: 0.45, sweep: 'left to right', match: 'by angle' },
  timing: { travel: 400, fadeIn: 90, videoFade: 380, speed: 1 },
  color: { ink: '#111111', accent: '#2f5bff', paper: '#ffffff' },
};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// a seeded random so a resample with the same settings gives the same dots
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// smooth flow field: nearby points get nearly the same value (-1..1). scale = feature size in px
const flow = (x, y, scale, s = 0) => { const f = 1 / Math.max(1, scale);
  return (Math.sin(x * f * 1.7 + 1.3 + s) * Math.cos(y * f * 2.3 + 0.4) + Math.sin((x * 0.6 - y) * f * 1.1 + 2.1 + s) + Math.cos((x + y * 0.4) * f * 0.8 + s * 2)) / 3; };

/* sample a source into dots. mode 'ink' = line art (darkest pixel per cell), 'ui' = image (mean ink).
   fit 'cover-top' mirrors .sheet img/video { object-fit: cover; object-position: top center } */
function sample(src, w, h, P, mode, rand) {
  const off = document.createElement('canvas'); off.width = w; off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  if (mode === 'ui') {
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
    const s = Math.max(w / sw, h / sh);
    ctx.drawImage(src, (w - sw * s) / 2, 0, sw * s, sh * s);
  } else {
    ctx.drawImage(src, 0, 0, w, h);
  }
  const { data } = ctx.getImageData(0, 0, w, h);
  const G = P.grid, step = Math.max(2, Math.round(G.step)), out = [];
  for (let cy = 0; cy < h; cy += step) {
    for (let cx = 0; cx < w; cx += step) {
      let max = 0, sum = 0, n = 0, blue = 0;
      for (let y = cy; y < Math.min(h, cy + step); y++) {
        for (let x = cx; x < Math.min(w, cx + step); x++) {
          const i = (y * w + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
          const ink = Math.max(1 - lum, sat * 0.8);
          if (ink > max) max = ink; sum += ink; n++;
          if (b > r + 60 && b > g + 30) blue++;
        }
      }
      const mean = sum / n, accent = blue > n * 0.15;
      const jx = (rand() - 0.5) * step * G.jitter, jy = (rand() - 0.5) * step * G.jitter;
      const x = cx + step / 2 + jx, y = cy + step / 2 + jy;
      if (mode === 'ink') {
        if (max < G.inkThreshold && !accent) continue;
        out.push({ x, y, shade: accent ? 0.6 : max, accent, size: P.dots.sizeMin + (P.dots.sizeMax - P.dots.sizeMin) * 0.45 * max });
      } else {
        const ink = clamp(mean * 1.4);
        if (ink < G.uiThreshold) {
          if (rand() < G.paperDots) out.push({ x, y, shade: 0.12, accent: false, size: P.dots.sizeMin * 0.6 });
          continue;
        }
        const k = Math.pow(ink, G.uiGamma);
        out.push({ x, y, shade: 0.25 + 0.75 * k, accent: false, size: P.dots.sizeMin + (P.dots.sizeMax - P.dots.sizeMin) * k });
      }
    }
  }
  return out;
}

export class DotTransition {
  /* stage: the tile (.ill); face: element holding the illustration canvas; media: the <video>/<img>
     shown at the end; poster: an image to sample the UI from (a video's poster) */
  /* illustrationControl (optional): { rewind(), play() } so the story replays when it shows again */
  constructor({ stage, illustration, face, media, poster, params = DEFAULTS, onState, illustrationControl }) {
    Object.assign(this, { stage, illustration, face, media, poster, P: params, onState, illustrationControl });
    this.canvas = document.createElement('canvas'); this.canvas.className = 'dots';
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', opacity: '0' });
    stage.appendChild(this.canvas);
    this.p = 0; this.dir = 0; this.raf = 0; this.state = 'illustration';
    this.media.style.opacity = '0';
  }

  setParams(P) { this.P = P; }

  prepare() {
    const r = this.stage.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return;
    this.w = w; this.h = h;
    const rand = rng(7);
    const src = sample(this.illustration, w, h, this.P, 'ink', rand);
    const dst = sample(this.uiSource(), w, h, this.P, 'ui', rand);
    const cx = w / 2, cy = h / 2, M = this.P.motion;
    const key = M.match === 'by angle' ? (d) => Math.atan2(d.y - cy, d.x - cx) * 1000 + Math.hypot(d.x - cx, d.y - cy) / w
      : M.match === 'by x' ? (d) => d.x * 1000 + d.y : null;
    if (key) { src.sort((a, b) => key(a) - key(b)); dst.sort((a, b) => key(a) - key(b)); }
    else { for (const arr of [src, dst]) for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } }

    const S = src.length, T = dst.length, N = Math.max(S, T, 1);
    const D = this.P.dots, R = rng(11);
    this.dots = new Array(N);
    let lastS = -1, lastT = -1;
    for (let i = 0; i < N; i++) {
      const si = Math.floor(i * S / N), ti = Math.floor(i * T / N);
      const a = src[si] || { x: cx, y: cy, size: 0, shade: 0 }, b = dst[ti] || { x: cx, y: cy, size: 0, shade: 0 };
      const firstS = si !== lastS, firstT = ti !== lastT; lastS = si; lastT = ti;
      const band = M.bands * w, coh = clamp(M.coherence);
      const radial = Math.atan2(a.y - cy, a.x - cx) + M.curl * Math.PI * 0.5 * (0.5 + R());
      const field = flow(a.x, a.y, band) * Math.PI * (1 + M.curl);
      const theta = coh * field + (1 - coh) * radial;
      const amp = M.scatter * w * (0.3 + Math.pow(R(), 2) * 1.7) * (1 - coh * 0.6 + coh * 1.2 * Math.abs(flow(a.x, a.y, band, 5)));
      const sweep = M.sweep === 'left to right' ? a.x / w * 0.8 + R() * 0.2
        : M.sweep === 'center out' ? Math.hypot(a.x - cx, a.y - cy) / Math.hypot(cx, cy) * 0.8 + R() * 0.2 : R();
      this.dots[i] = {
        ax: a.x, ay: a.y, as: firstS ? a.size : 0, ash: a.shade, aacc: !!a.accent,
        bx: b.x, by: b.y, bs: firstT ? b.size : 0, bsh: b.shade,
        dx: Math.cos(theta) * amp * M.horizontal / Math.sqrt(M.horizontal), dy: Math.sin(theta) * amp / Math.sqrt(M.horizontal),
        phase: R() * Math.PI * 2, delay: sweep,
        big: R() < D.bigChance ? 0.6 + R() * 0.4 : 0, flash: R() < D.accentChance,
      };
    }
    this.counts = { illustration: S, ui: T };
    this.draw();
  }

  /* direction 1 = to the UI, -1 = back to the illustration */
  /* the UI the dots land on: the video's current frame once it has one, so the halftone matches
     the frame the video stops on (leaving) or resumes from (entering); before that, the poster */
  uiSource() {
    const m = this.media;
    return m.tagName === 'VIDEO' && m.readyState >= 2 && m.videoWidth ? m : this.poster;
  }

  play(direction) {
    const fromEnd = !this.dots || (direction < 0 && this.p >= 1) || (direction > 0 && this.p <= 0);
    this.dir = direction;
    if (!fromEnd) return this.run();
    // starting from either end: pause the video and re-sample, so the dots match what's on screen.
    // Going back, the illustration first rewinds to its rest frame (hidden), so the dots land on
    // the start of its story and it can play again once it shows.
    if (this.media.tagName === 'VIDEO') this.media.pause();
    const warm = this.warmed; this.warmed = false;
    if (direction > 0 && warm && this.dots) { this.setLayer('dots'); return this.run(); }   // sampled ahead of time
    if (direction < 0 && this.illustrationControl) {
      this.illustrationControl.rewind();
      this.setLayer('dots');
      const token = this.token = {};
      requestAnimationFrame(() => requestAnimationFrame(() => { if (this.token !== token || this.dir !== direction) return; this.prepare(); this.run(); }));
      return;
    }
    this.prepare();
    this.setLayer('dots');
    this.run();
  }

  /* sample ahead of time (idle, while the illustration rests on its last frame), so the first
     frame of a hover doesn't wait on sampling. Any play() after this samples fresh again. */
  warm() { if (this.p <= 0 && !this.raf) { this.prepare(); this.warmed = true; } }

  run() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.tick(t)); } }

  jump(p) { this.p = clamp(p); this.dir = 0; this.setLayer(this.p >= 1 ? 'media' : this.p <= 0 ? 'illustration' : 'dots'); this.draw(); }

  tick(now) {
    const T = this.P.timing, dt = now - this.last; this.last = now;
    this.p = clamp(this.p + this.dir * dt / Math.max(1, T.travel / T.speed));
    this.draw();
    if ((this.dir > 0 && this.p >= 1) || (this.dir < 0 && this.p <= 0)) {
      this.raf = 0; this.setLayer(this.p >= 1 ? 'media' : 'illustration'); return;
    }
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  setLayer(which) {
    const T = this.P.timing, f = `${T.fadeIn / T.speed}ms`, v = `${T.videoFade / T.speed}ms`;
    this.face.style.transition = `opacity ${f} linear`;
    this.canvas.style.transition = `opacity ${which === 'media' ? v : f} linear`;
    this.media.style.transition = `opacity ${v} linear`;
    this.face.style.opacity = which === 'illustration' ? '1' : '0';
    this.canvas.style.opacity = which === 'dots' ? '1' : '0';
    this.media.style.opacity = which === 'media' ? '1' : '0';
    if (this.media.tagName === 'VIDEO') { if (which === 'media') this.media.play().catch(() => {}); else this.media.pause(); }
    if (which === 'illustration') this.illustrationControl?.play();
    this.state = which; this.onState?.(which);
  }

  draw() {
    const c = this.canvas, dpr = Math.min(devicePixelRatio, 2), w = this.w, h = this.h;
    if (!w || !this.dots) return;
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const P = this.P, D = P.dots, M = P.motion, C = P.color, levels = Math.max(2, Math.round(D.grays));
    const ink = hex(C.ink), paper = hex(C.paper);
    const bins = Array.from({ length: levels }, () => new Path2D()), accent = new Path2D();
    const stag = clamp(M.stagger, 0, 0.9);
    for (const d of this.dots) {
      const k = clamp((this.p - d.delay * stag) / (1 - stag)), e = ease(k), arc = Math.sin(Math.PI * k);
      const wob = Math.sin(Math.PI * 2 * k + d.phase) * M.wobble * arc;
      const x = d.ax + (d.bx - d.ax) * e + d.dx * arc - d.dy * wob;
      const y = d.ay + (d.by - d.ay) * e + d.dy * arc + d.dx * wob * 0.3;
      let s = d.as + (d.bs - d.as) * e + d.big * D.bigSize * arc * arc;
      if (s < 0.25) continue;
      let shade = d.ash + (d.bsh - d.ash) * e;
      if (d.big) shade = Math.max(shade, 0.55 + 0.45 * d.big * arc);
      // big dots stay charcoal, like the hero
      const path = !d.big && ((d.flash && arc > 0.35) || (d.aacc && e < 0.5)) ? accent : bins[Math.min(levels - 1, Math.round(shade * (levels - 1)))];
      path.moveTo(x + s / 2, y); path.arc(x, y, s / 2, 0, Math.PI * 2);
    }
    bins.forEach((path, i) => {
      const t = i / (levels - 1);
      ctx.fillStyle = `rgb(${paper.map((p, j) => Math.round(p + (ink[j] - p) * (0.15 + 0.85 * t))).join(',')})`;
      ctx.fill(path);
    });
    ctx.fillStyle = C.accent; ctx.fill(accent);
  }
}
