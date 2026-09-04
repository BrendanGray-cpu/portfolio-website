/* ============================================================
   tuner.js — a vanilla DialKit.
   Same config grammar as dialkit (React):
     key: [default, min, max]            slider
     key: 1.2                            slider, range inferred
     key: true                           toggle
     key: { type: "spring", stiffness, damping }
     key: { type: "select", options, default }
     key: { type: "action", label }
     key: { ...nested }                  folder
   useDialKit(name, config, { onChange, onAction }) returns a live
   params object; values persist in localStorage per panel name.
   Dev-only: loaded by main.js when the URL has ?tune.
   ============================================================ */

const CSS = `
.dk { position: fixed; top: 12px; right: 12px; z-index: 1000; width: 272px; max-height: calc(100vh - 24px);
  overflow: auto; background: #1b1b1b; color: #e8e8e8; border-radius: 12px; font: 500 12px/1.3 var(--font, system-ui);
  box-shadow: 0 12px 40px rgba(0,0,0,.45); user-select: none; -webkit-font-smoothing: antialiased; }
.dk::-webkit-scrollbar { width: 6px } .dk::-webkit-scrollbar-thumb { background: #444; border-radius: 3px }
.dk__head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; font-weight: 700;
  font-size: 13px; cursor: grab; border-bottom: 1px solid #2c2c2c; position: sticky; top: 0; background: #1b1b1b; z-index: 1; }
.dk__head button { color: #9a9a9a; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 6px; }
.dk__head button:hover { color: #fff; background: #2c2c2c }
.dk__body { padding: 6px 0 8px }
.dk__folder { border-top: 1px solid #262626 }
.dk__folder > summary { list-style: none; cursor: pointer; padding: 8px 12px; color: #bdbdbd; font-weight: 700;
  font-size: 11px; letter-spacing: .04em; text-transform: uppercase; display: flex; justify-content: space-between; }
.dk__folder > summary::-webkit-details-marker { display: none }
.dk__folder > summary::after { content: "▾"; color: #666 } .dk__folder:not([open]) > summary::after { content: "▸" }
.dk__row { display: grid; grid-template-columns: 92px 1fr 46px; gap: 8px; align-items: center; padding: 4px 12px; }
.dk__row label { color: #bdbdbd; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.dk__row input[type=range] { width: 100%; accent-color: #fff; height: 18px; margin: 0; cursor: ew-resize }
.dk__row input[type=number], .dk__row select { width: 100%; background: #2a2a2a; color: #fff; border: 0; border-radius: 5px;
  padding: 3px 4px; font: inherit; font-variant-numeric: tabular-nums; text-align: right; }
.dk__row input[type=number] { -moz-appearance: textfield } .dk__row input::-webkit-inner-spin-button { display: none }
.dk__row select { grid-column: 2 / 4; text-align: left }
.dk__toggle { grid-column: 2 / 4; justify-self: start; width: 34px; height: 18px; border-radius: 9px; background: #3a3a3a; position: relative; transition: background .15s }
.dk__toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: transform .15s }
.dk__toggle.is-on { background: #4caf7d } .dk__toggle.is-on::after { transform: translateX(16px) }
.dk__actions { display: flex; gap: 6px; padding: 8px 12px 4px; flex-wrap: wrap }
.dk__actions button { flex: 1; background: #2c2c2c; color: #fff; padding: 7px 10px; border-radius: 7px; font-weight: 600; font-size: 12px }
.dk__actions button:hover { background: #3a3a3a }
.dk__toast { position: fixed; bottom: 16px; right: 16px; background: #1b1b1b; color: #fff; padding: 8px 12px; border-radius: 8px; font: 500 12px var(--font, system-ui); z-index: 1001; }
`;

function fmt(v, step) { const d = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3; return Number(v).toFixed(d); }
function stepFor(min, max) { const span = Math.abs(max - min); return span > 100 ? 1 : span > 10 ? 0.5 : span > 2 ? 0.05 : span > 0.2 ? 0.01 : 0.001; }
function inferRange(v) { if (v === 0) return [0, 1]; const m = Math.abs(v); return v < 0 ? [v * 2, -v * 2] : [0, m * 2]; }
const isFolder = (v) => v && typeof v === "object" && !Array.isArray(v) && !v.type;

export function useDialKit(name, config, { onChange, onAction } = {}) {
  if (!document.getElementById("dk-style")) {
    const st = document.createElement("style"); st.id = "dk-style"; st.textContent = CSS; document.head.append(st);
  }
  const key = "dialkit:" + name;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) {}

  const params = {};
  const panel = document.createElement("div");
  panel.className = "dk";
  panel.innerHTML = `<div class="dk__head"><span>${name}</span><span><button data-collapse>hide</button></span></div><div class="dk__body"></div>`;
  const body = panel.querySelector(".dk__body");
  const actions = document.createElement("div"); actions.className = "dk__actions";

  const save = () => { try { localStorage.setItem(key, JSON.stringify(params)); } catch (_) {} };
  const emit = (path, value) => { save(); onChange?.(params, path, value); };
  const get = (obj, path) => path.reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);

  function buildControl(container, target, k, spec, path) {
    const stored = get(saved, path);
    const row = document.createElement("div"); row.className = "dk__row";
    const label = document.createElement("label"); label.textContent = k; row.append(label);

    if (typeof spec === "boolean") {
      target[k] = stored ?? spec;
      const t = document.createElement("button"); t.className = "dk__toggle" + (target[k] ? " is-on" : ""); t.type = "button";
      t.onclick = () => { target[k] = !target[k]; t.classList.toggle("is-on", target[k]); emit(path, target[k]); };
      row.append(t); container.append(row); return;
    }
    if (spec && spec.type === "select") {
      target[k] = stored ?? spec.default ?? spec.options[0];
      const s = document.createElement("select");
      for (const o of spec.options) { const op = document.createElement("option"); op.value = o; op.textContent = o; op.selected = o === target[k]; s.append(op); }
      s.onchange = () => { target[k] = s.value; emit(path, s.value); };
      row.append(s); container.append(row); return;
    }
    if (spec && spec.type === "spring") {
      // physics mode: stiffness + damping (+ optional mass) as sliders in a sub-folder
      const sub = { type: "spring" };
      target[k] = sub;
      const det = document.createElement("details"); det.className = "dk__folder"; det.open = true;
      det.innerHTML = `<summary>${k} · spring</summary>`;
      buildControl(det, sub, "stiffness", [spec.stiffness ?? 200, 20, 800], [...path, "stiffness"]);
      buildControl(det, sub, "damping", [spec.damping ?? 20, 1, 60], [...path, "damping"]);
      if (spec.mass != null) buildControl(det, sub, "mass", [spec.mass, 0.2, 5], [...path, "mass"]);
      container.append(det); return;
    }
    // slider
    let def, min, max;
    if (Array.isArray(spec)) [def, min, max] = spec; else { def = spec; [min, max] = inferRange(spec); }
    const step = stepFor(min, max);
    target[k] = stored ?? def;
    const r = document.createElement("input"); r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = target[k];
    const n = document.createElement("input"); n.type = "number"; n.min = min; n.max = max; n.step = step; n.value = fmt(target[k], step);
    const set = (v) => { v = Math.min(max, Math.max(min, Number(v))); target[k] = v; r.value = v; n.value = fmt(v, step); emit(path, v); };
    r.oninput = () => set(r.value);
    n.onchange = () => set(n.value);
    r.ondblclick = () => set(def);
    row.append(r, n); container.append(row);
  }

  function build(container, target, cfg, path) {
    for (const [k, spec] of Object.entries(cfg)) {
      if (spec && spec.type === "action") {
        const b = document.createElement("button"); b.type = "button"; b.textContent = spec.label || k;
        b.onclick = () => onAction?.(k, params); actions.append(b); continue;
      }
      if (isFolder(spec)) {
        const det = document.createElement("details"); det.className = "dk__folder"; det.open = spec.__open !== false;
        det.innerHTML = `<summary>${k}</summary>`;
        target[k] = {};
        build(det, target[k], Object.fromEntries(Object.entries(spec).filter(([kk]) => kk !== "__open")), [...path, k]);
        container.append(det); continue;
      }
      buildControl(container, target, k, spec, [...path, k]);
    }
  }
  build(body, params, config, []);
  if (actions.children.length) body.append(actions);
  document.body.append(panel);

  // collapse + drag
  panel.querySelector("[data-collapse]").onclick = (e) => { body.hidden = !body.hidden; e.target.textContent = body.hidden ? "show" : "hide"; };
  const head = panel.querySelector(".dk__head");
  head.onpointerdown = (e) => {
    if (e.target.tagName === "BUTTON") return;
    const sx = e.clientX - panel.offsetLeft, sy = e.clientY - panel.offsetTop;
    panel.style.right = "auto";
    const mv = (ev) => { panel.style.left = ev.clientX - sx + "px"; panel.style.top = ev.clientY - sy + "px"; };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };

  params.__reset = () => { try { localStorage.removeItem(key); } catch (_) {} location.reload(); };
  params.__toast = (msg) => {
    const t = document.createElement("div"); t.className = "dk__toast"; t.textContent = msg; document.body.append(t);
    setTimeout(() => t.remove(), 1600);
  };
  return params;
}

/** Sample a damped spring into a CSS linear() easing. Returns { css, duration } (ms). */
export function springToLinear(stiffness, damping, mass = 1, points = 48) {
  const w0 = Math.sqrt(stiffness / mass), zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const wd = w0 * Math.sqrt(Math.max(0, 1 - zeta * zeta));
  const settle = zeta < 1 ? -Math.log(0.005) / (zeta * w0) : 4 / w0;
  const f = (t) => zeta < 1
    ? 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t))
    : 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  const out = [];
  for (let i = 0; i <= points; i++) out.push(f((i / points) * settle).toFixed(4));
  out[out.length - 1] = "1";
  return { css: `linear(${out.join(", ")})`, duration: Math.round(settle * 1000) };
}
