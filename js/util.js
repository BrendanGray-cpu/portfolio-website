/* ============================================================
   util.js — tiny DOM + motion helpers shared by every module
   ============================================================ */
export const DEBUG = new URLSearchParams(location.search);
export const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches || DEBUG.has("rm");
export const NO_GL = DEBUG.has("nogl");
export const MOBILE = window.matchMedia("(max-width: 720px)");
export const COARSE = window.matchMedia("(hover: none)").matches;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Next frame, or 40ms if the tab is hidden (rAF never fires there). */
export const raf = () => new Promise((r) => { const t = setTimeout(r, 40); requestAnimationFrame(() => { clearTimeout(t); r(); }); });
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** h("div.class#id", {attrs}, ...children) */
export function h(tag, attrs, ...children) {
  const [name, ...parts] = tag.split(/(?=[.#])/);
  const el = document.createElement(name || "div");
  for (const p of parts) {
    if (p[0] === ".") el.classList.add(p.slice(1));
    else if (p[0] === "#") el.id = p.slice(1);
  }
  if (attrs && typeof attrs === "object" && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k in el && k !== "list" && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
  } else if (attrs != null) {
    children.unshift(attrs);
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Animate with WAAPI and resolve when done. Respects reduced motion. */
export function animate(el, keyframes, options = {}) {
  if (!el) return Promise.resolve();
  const opts = { fill: "both", easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", ...options };
  if (RM) { opts.duration = 1; opts.delay = 0; }
  const a = el.animate(keyframes, opts);
  return a.finished.catch(() => {}).then(() => {
    // Commit the final state as inline styles so the animation can be released.
    try { a.commitStyles(); } catch (_) {}
    a.cancel();
  });
}

/** Stagger-reveal a list of elements (opacity + translate). */
export function reveal(els, { delay = 0, step = 60, duration = 520, y = 14, x = 0, easing } = {}) {
  const list = Array.from(els);
  const ps = list.map((el, i) => {
    el.classList.remove("reveal");
    return animate(el,
      [{ opacity: 0, transform: `translate(${x}px, ${y}px)` }, { opacity: 1, transform: "translate(0, 0)" }],
      { duration, delay: delay + i * step, easing: easing || "cubic-bezier(0.2, 0.7, 0.2, 1)" });
  });
  return Promise.all(ps).then(() => list.forEach((el) => { el.style.opacity = ""; el.style.transform = ""; }));
}

/** Stagger-hide a list of elements. */
export function conceal(els, { delay = 0, step = 30, duration = 220, y = -10, x = 0 } = {}) {
  const list = Array.from(els);
  return Promise.all(list.map((el, i) => animate(el,
    [{ opacity: 1, transform: "translate(0,0)" }, { opacity: 0, transform: `translate(${x}px, ${y}px)` }],
    { duration, delay: delay + i * step, easing: "cubic-bezier(0.5, 0, 0.9, 0.4)" })));
}

/** Decode an image, but never wait longer than `max` ms. */
export function preload(src, max = 400) {
  const img = new Image();
  img.src = src;
  const p = img.decode ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = img.onerror = r; });
  return Promise.race([p, sleep(max)]).then(() => img);
}

/* ---------- Icons (inline SVG) ---------- */
const svg = (inner, vb = "0 0 16 16") =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

export const ICONS = {
  external: svg('<path d="M9.5 2.5H13.5V6.5"/><path d="M13.5 2.5L7.5 8.5"/><path d="M11.5 9.5V12.5C11.5 13.05 11.05 13.5 10.5 13.5H3.5C2.95 13.5 2.5 13.05 2.5 12.5V5.5C2.5 4.95 2.95 4.5 3.5 4.5H6.5"/>'),
  download: svg('<path d="M8 2.5V10"/><path d="M4.75 7L8 10.25L11.25 7"/><path d="M2.5 11.5V12.5C2.5 13.05 2.95 13.5 3.5 13.5H12.5C13.05 13.5 13.5 13.05 13.5 12.5V11.5"/>'),
  chevLeft: svg('<path d="M9.5 3L5 8L9.5 13"/>').replace("<svg", '<svg class="chev-left"'),
  chevRight: svg('<path d="M6.5 3L11 8L6.5 13"/>').replace("<svg", '<svg class="chev-right"'),
};
export const icon = (name) => h("span", { html: ICONS[name], style: { display: "contents" } });
