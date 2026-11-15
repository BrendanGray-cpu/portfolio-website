import * as THREE from 'three';
// The portfolio hero. Ported from head-lab/lab.js: same simulation and shaders, no dial panel.
// Tuned values come from /assets/data/hero-params.json (paste the lab's "Copy parameters" there).
// The lab's panel calls become no-ops on the site, even when another page tool loads the real DialKit.
const noopDials = { setValues() {}, subscribe() {}, destroy() {} };
const HeadDials = { createDialRoot() {}, createDialKit: () => noopDials };
const DATA = '/assets/data/';

/* ─────────────────────────────────────────────────────────
 * HEAD LAB
 *
 * The scan is 200k dots. Each dot springs toward a target:
 *   target = scan position
 *          + emotion offset (from the photo landmarks, × intensity)
 *          + cheek puff (struggle only)
 *          → then the head pose for that emotion (rotation about the neck)
 * Swirling the cursor through the dots pushes them around and builds
 * energy. Past the threshold, the next emotion becomes the target, so
 * the dots reform as the next face in the arc.
 *
 *   excited → struggle → breakthrough → proud
 * ───────────────────────────────────────────────────────── */

const STORE_KEY = 'head-lab.v4';
// ?embed: the lab runs inside another page (the portfolio hero). It reads the values tuned
// here (same localStorage), never writes them, hides its panel, and takes overrides from
// the parent page through postMessage({ type: 'head-params', params }).
const EMBED = true;   // on the site the hero never writes settings

// Every state the hero can be in. ?sim= forces one for checking: touch | reduced | slow | nowebgl
const SIM = new URLSearchParams(location.search).get('sim') || '';
const REDUCED = SIM === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = (e) => e.pointerType === 'touch' || SIM === 'touch';
const EMOTIONS = ['excited', 'struggle', 'breakthrough', 'proud'];
const LABELS = { excited: 'Excited', struggle: 'Struggle', breakthrough: 'Breakthrough', proud: 'Proud' };
// the project phase each emotion belongs to; it sits before the word so the pill reads as a project cycle
const PHASES = { excited: 'Kickoff:', struggle: 'Deep in it:', breakthrough: 'It clicks:', proud: 'Handoff:' };

const pose = (pitch, yaw, roll, forward) => ({
  pitch: [pitch, -30, 30, 0.5], yaw: [yaw, -30, 30, 0.5], roll: [roll, -20, 20, 0.5], forward: [forward, -0.4, 0.4, 0.01],
});

const CONFIG = {
  stage: { type: 'select', options: EMOTIONS, default: 'excited' },
  next: { type: 'action', label: 'Next emotion' },
  intro: { type: 'action', label: 'Play intro (assemble)' },
  scatter: { type: 'action', label: 'Scatter and reform' },
  look: {
    points: [200000, 5000, 200000, 1000],
    size: [2, 0.3, 6, 0.1],
    dot: '#111111',
    accent: '#2f5bff',
    background: '#f4f4f2',
    texture: [1, 0, 1, 0.01],
    shade: [0.8, 0, 1, 0.01],
    depthFade: [0.3, 0, 1, 0.01],
    opacity: [1, 0.1, 1, 0.01],
  },
  camera: {
    distance: [6.2, 2, 12, 0.05],
    fov: [28, 10, 70, 1],
    offsetX: [0, -1, 1, 0.01],
    offsetY: [0.05, -1, 1, 0.01],
    crop: [-0.9, -1.5, -0.3, 0.01],
    layout: { type: 'select', options: ['lab', 'hero'], default: 'lab' },
  },
  swirl: {
    radius: [0.32, 0.05, 1, 0.01],
    strength: [1.2, 0, 4, 0.05],
    curl: [0.7, 0, 1, 0.01],
    drag: [0.45, 0, 1, 0.01],
    push: [0.25, 0, 1, 0.01],
    depth: [0.35, 0, 1, 0.01],
    sequence: { type: 'select', options: ['full arc', 'first swirl jumps to proud'], default: 'full arc' },
    loop: true,
  },
  reform: {
    stiffness: [0.07, 0.005, 0.3, 0.005],
    damping: [0.2, 0.02, 0.6, 0.01],
    poseStiffness: [0.08, 0.005, 0.3, 0.005],
    poseDamping: [0.22, 0.02, 0.6, 0.01],
  },
  expression: {
    strong: { type: 'action', label: 'Apply strong expression defaults' },
    depthScale: [0.3, 0, 2, 0.05],
    excited: [3, 0, 8, 0.05],
    struggle: [3.5, 0, 8, 0.05],
    breakthrough: [3, 0, 8, 0.05],
    proud: [4, 0, 8, 0.05],
    gains: { brows: [1.8, 0, 4, 0.05], eyes: [1.4, 0, 4, 0.05], mouth: [2, 0, 4, 0.05], jaw: [1.6, 0, 4, 0.05], rest: [1, 0, 3, 0.05] },
    puff: [0.06, 0, 0.25, 0.005],
    puffSide: { type: 'select', options: ['left', 'right'], default: 'left' },
    puffRadius: [0.17, 0.05, 0.4, 0.01],
  },
  pose: {
    excited: pose(-3, 0, 0, 0.12),
    struggle: pose(-12, 0, 7, 0),
    breakthrough: pose(3, 0, 0, 0.03),
    proud: pose(10, -4, 0, 0),
    neckBend: [0.6, 0, 1, 0.01],
  },
  readability: {
    presetLevels: { type: 'action', label: 'Preset: levels only' },
    presetFeatures: { type: 'action', label: 'Preset: feature map' },
    presetDepth: { type: 'action', label: 'Preset: depth size' },
    presetEngraving: { type: 'action', label: 'Preset: engraving' },
    presetReset: { type: 'action', label: 'Reset readability' },
    levels: { black: [0.12, 0, 1, 0.01], white: [0.57, 0, 1, 0.01], gamma: [1, 0.3, 3, 0.05] },
    features: {
      eyes: [0, 0, 1, 0.01], brows: [0, 0, 1, 0.01], mouth: [0, 0, 1, 0.01],
      beard: [0, 0, 1, 0.01], hair: [0, 0, 1, 0.01], notSkin: [0, 0, 1, 0.01],
      lids: [0.85, 0, 1, 0.01],
    },
    size: { byDepth: [0, 0, 2, 0.05], depthRange: [0.6, 0.1, 2, 0.05], byInk: [0, 0, 1.5, 0.05] },
    rim: [0, 0, 1, 0.01],
    thinSkin: [0, 0, 0.95, 0.01],
    evenTone: [0.6, 0, 1, 0.01],
  },
  eyes: {
    // almond of dark dots per eye: Up / Down = how far it reaches above / below the eye line
    // (face units, about 0.03 is a normal open eye), Dark = how strongly it inks
    excited: { up: [0.032, 0, 0.1, 0.002], down: [0.022, 0, 0.1, 0.002], dark: [1, 0, 1, 0.01] },
    struggle: { up: [0.02, 0, 0.1, 0.002], down: [0.014, 0, 0.1, 0.002], dark: [1, 0, 1, 0.01] },
    breakthrough: { up: [0.046, 0, 0.1, 0.002], down: [0.03, 0, 0.1, 0.002], dark: [1, 0, 1, 0.01] },
    proud: { up: [0.024, 0, 0.1, 0.002], down: [0.016, 0, 0.1, 0.002], dark: [1, 0, 1, 0.01] },
    width: [1, 0.5, 1.5, 0.01],
    softness: [0.35, 0.02, 1, 0.01],
    clearAround: [0.7, 0, 1, 0.01],   // lightens dark scan dots just outside the almond
  },
  mood: {
    show: true,
    top: [6, 0, 90, 0.5],              // label position, % from the top of the view
    eyebrow: 'Current design mood',
    fill: '#2f5bff',
    threshold: [6, 0.5, 40, 0.5],      // how much scrambling fills the bar
    floatTime: [1.5, 0, 6, 0.1],       // seconds a touched dot hangs before returning
    drift: [0.4, 0, 2, 0.05],          // slow wander while floating
    returnRamp: [0.4, 0.05, 2, 0.05],  // seconds for a dot's spring to come back
    glyphs: { type: 'select', options: ['symbols', 'letters', 'blocks'], default: 'symbols' },
    decode: [500, 100, 2000, 50],      // ms for the next word to resolve
    anticipation: [0.06, 0, 0.25, 0.01], // how far the dots gather in before the new face (0 = off)
    gatherMs: [140, 40, 600, 10],      // length of that gather
    nameTag: false,                    // also show the emotion on the selection box
  },
  view: {
    restYaw: [-18, -60, 60, 1],          // degrees; negative turns the face to the viewer's left
    restPitch: [4, -30, 30, 1],          // positive looks slightly down onto the head
    dragYaw: [25, 0, 90, 1],             // how far a drag can turn it from rest
    dragPitch: [10, 0, 45, 1],
    returnToRest: true,
    returnDelay: [2.5, 0, 10, 0.5],      // seconds after letting go
    swayYaw: [4, 0, 15, 0.5],
    swayPitch: [1.5, 0, 10, 0.5],
    swayRoll: [1, 0, 8, 0.5],
    bob: [0.015, 0, 0.1, 0.005],
    swaySpeed: [0.2, 0.02, 1, 0.01],
    wheelZoom: false,
    introOnLoad: true,
    introCurl: [0.035, 0, 0.1, 0.005],  // sideways push that bends each dot's path into an arc
  },
  follow: { enabled: false, amount: [8, 0, 25, 1] },
  grid: {
    show: true,
    color: '#9a978f',
    extent: [1.1, 0.5, 2, 0.05],
    step: [0.25, 0.05, 1, 0.05],
    labels: true,
    resetView: { type: 'action', label: 'Reset view' },
  },
  overlay: { selection: false, coords: true },
};

// ---------- params ----------
function defaultsFrom(cfg) {
  const out = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (Array.isArray(v)) out[k] = v[0];
    else if (v && typeof v === 'object') {
      if (v.type === 'action') continue;
      if ('default' in v) out[k] = v.default;
      else out[k] = defaultsFrom(v);
    } else out[k] = v;
  }
  return out;
}
function mergeDeep(a, b) {   // like merge, but keeps keys from b even if a lacks them
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && a?.[k] && typeof a[k] === 'object' ? mergeDeep(a[k], v) : v;
  return out;
}
function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over ?? {})) {
    if (!(k in base)) continue;
    out[k] = base[k] && typeof base[k] === 'object' ? merge(base[k], v) : v;
  }
  return out;
}
let P = merge(defaultsFrom(CONFIG), await fetch(DATA + 'hero-params.json').then(r => r.ok ? r.json() : null).catch(() => null));
try { if (!localStorage.getItem('head-lab.migr-sel')) { P.overlay.selection = false; if (!EMBED) { localStorage.setItem('head-lab.migr-sel', '1'); localStorage.setItem(STORE_KEY, JSON.stringify(P)); } } } catch {}
const save = () => { if (EMBED) return; try { localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch {} };

// ---------- data ----------
// Load with a progress readout; the intro assembles the head the moment data arrives.
const loadingEl = document.getElementById('loading');
const FILES = ['points.bin', 'rig.bin', 'masks.bin', 'eyes.bin'];
const got = {}, total = {};
const showLoad = () => { const g = Object.values(got).reduce((a, b) => a + b, 0), t = Object.values(total).reduce((a, b) => a + b, 0); if (loadingEl && t) loadingEl.textContent = `Assembling ${Math.round(g / t * 100)}%`; };
async function fetchBin(name) {
  const r = await fetch(DATA + name);
  total[name] = +r.headers.get('content-length') || 1; got[name] = 0;
  const reader = r.body.getReader(), parts = [];
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    parts.push(value); got[name] += value.length; showLoad();
    if (SIM === 'slow') await new Promise(res => setTimeout(res, 400));   // simulate a slow connection
  }
  const out = new Uint8Array(got[name]); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out.buffer;
}
const [meta, ptsBuf, rigBuf, maskBuf, eyeBuf] = await Promise.all([
  fetch(DATA + 'meta.json').then(r => r.json()), ...FILES.map(fetchBin),
]);
const N = meta.count, K = meta.k;
// unpack: positions uint16 inside a bounding box, normals int8, weights uint8, eye frame int16
const BASE = new Float32Array(N * 3), NRM = new Float32Array(N * 3);
{ const pq = new Uint16Array(ptsBuf, 0, N * 3), nq = new Int8Array(ptsBuf, N * 6, N * 3), lo = meta.bboxLo, hi = meta.bboxHi;
  for (let i = 0; i < N * 3; i++) { const c = i % 3; BASE[i] = lo[c] + pq[i] / 65535 * (hi[c] - lo[c]); NRM[i] = nq[i] / 127; } }
const LUM = new Uint8Array(ptsBuf, N * 9, N);
const EYE_U = new Float32Array(N), EYE_V = new Float32Array(N);
{ const e = new Int16Array(eyeBuf); for (let i = 0; i < N; i++) { EYE_U[i] = e[i] / 2000; EYE_V[i] = e[N + i] / 100000; } }
// masks.bin: 7 bytes per dot (eyes, brows, mouth, beard, hair, notSkin, lid)
const MASK = new Uint8Array(maskBuf), MASK_A = new Uint8Array(N * 3), MASK_B = new Uint8Array(N * 3), LID = new Uint8Array(N);
for (let i = 0; i < N; i++) { for (let c = 0; c < 3; c++) { MASK_A[i * 3 + c] = MASK[i * 7 + c]; MASK_B[i * 3 + c] = MASK[i * 7 + 3 + c]; } LID[i] = MASK[i * 7 + 6]; }
const RND = new Float32Array(N); { let x = 12345; for (let i = 0; i < N; i++) { x = (x * 1103515245 + 12345) >>> 0; RND[i] = (x >>> 8) / 16777216; } }
const RIG_I = new Uint16Array(rigBuf, 0, N * K);
const RIG_W = new Float32Array(N * K); { const wq = new Uint8Array(rigBuf, N * K * 2, N * K); for (let i = 0; i < N * K; i++) RIG_W[i] = wq[i] / 255; }
const NEUTRAL = meta.neutral;
const order = meta.order;

// raw per-point emotion offsets (before intensity and depth scale). Each landmark's offset is
// scaled by its region gain (brows, eyes, mouth, jaw), so parts of the face exaggerate separately.
const RAW = {};
for (const e of order) RAW[e] = new Float32Array(N * 3);
let gainKey = '';
function computeRaw() {
  const G = P.expression.gains, key = JSON.stringify(G);
  if (key === gainKey) return false; gainKey = key;
  const gl = meta.regionW.map((w) => {
    let g = 0, t = 0; meta.regions.forEach((r, k) => { g += w[k] * (G[r] - G.rest); t += w[k]; });
    return G.rest + g / Math.max(1, t);
  }).map((g, l) => g * (meta.pin ? meta.pin[l] : 1));   // face outline pinned so no mask edge shows
  for (const e of order) computeRawFor(e, gl);
  return true;
}
function computeRawFor(e, gl) {
  const d = meta.emotions[e].map((v, l) => [v[0] * gl[l], v[1] * gl[l], v[2] * gl[l]]), out = RAW[e];
  for (let i = 0; i < N; i++) {
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < K; k++) {
      const w = RIG_W[i * K + k]; if (!w) continue;
      const l = d[RIG_I[i * K + k]]; x += w * l[0]; y += w * l[1]; z += w * l[2];
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
}
computeRaw();

// face-space target for the current emotion (pose is applied per frame)
const FACE_T = new Float32Array(N * 3);
function buildTargets() {
  computeRaw();
  const e = P.stage, raw = RAW[e], s = P.expression[e] ?? 1, dz = P.expression.depthScale;
  const cheek = P.expression.puffSide === 'left' ? meta.cheekR : meta.cheekL; // his left = viewer's right
  const puff = e === 'struggle' ? P.expression.puff : 0, r2 = P.expression.puffRadius ** 2;
  for (let i = 0; i < N; i++) {
    const j = i * 3;
    let x = BASE[j] + raw[j] * s, y = BASE[j + 1] + raw[j + 1] * s, z = BASE[j + 2] + raw[j + 2] * s * dz;
    if (puff) {
      const dx = BASE[j] - cheek[0], dy = BASE[j + 1] - cheek[1], dd = BASE[j + 2] - cheek[2];
      const f = puff * Math.exp(-(dx * dx + dy * dy + dd * dd) / r2);
      x += NRM[j] * f; y += NRM[j + 1] * f; z += NRM[j + 2] * f;
    }
    FACE_T[j] = x; FACE_T[j + 1] = y; FACE_T[j + 2] = z;
  }
}

// ---------- three ----------
const view = document.getElementById('view');
let renderer;
try {
  if (SIM === 'nowebgl') throw new Error('simulated');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
} catch {
  drawStill(); await new Promise(() => {});   // no WebGL: show the still and stop here
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
view.prepend(renderer.domElement);
loadingEl?.remove();

// The fallback: the same dots, drawn once on a 2D canvas at the rest angle, darkest dots nearest.
function drawStill() {
  loadingEl?.remove();
  const c = document.createElement('canvas'), w = view.clientWidth, h = view.clientHeight, dpr = Math.min(devicePixelRatio, 2);
  c.width = w * dpr; c.height = h * dpr; c.style.cssText = 'width:100%;height:100%;display:block'; view.prepend(c);
  const g = c.getContext('2d'); g.scale(dpr, dpr); g.fillStyle = P.look.background; g.fillRect(0, 0, w, h);
  const yaw = P.view.restYaw * Math.PI / 180, pitch = P.view.restPitch * Math.PI / 180, sc = Math.min(w, h) / 2.6;
  const pts = [];
  for (let i = 0; i < N; i += 2) {
    const x = BASE[i * 3], y = BASE[i * 3 + 1], z = BASE[i * 3 + 2]; if (y < P.camera.crop) continue;
    const x1 = x * Math.cos(yaw) + z * Math.sin(yaw), z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    pts.push([w / 2 + x1 * sc, h * 0.55 - y2 * sc, z2, LUM[i] / 255]);
  }
  pts.sort((a, b) => a[2] - b[2]);
  for (const [px, py, , l] of pts) { const ink = 1 - 0.9 * Math.min(1, Math.max(0, (l - 0.15) / 0.4)); g.globalAlpha = ink; g.fillStyle = P.look.dot; g.fillRect(px, py, 1.4, 1.4); }
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(P.camera.fov, 1, 0.1, 50);

const POS = new Float32Array(N * 3), VEL = new Float32Array(N * 3), HEAT = new Float32Array(N);
POS.set(BASE);
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(POS, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('nrm', new THREE.BufferAttribute(NRM, 3));
geo.setAttribute('lum', new THREE.BufferAttribute(LUM, 1, true));
geo.setAttribute('heat', new THREE.BufferAttribute(HEAT, 1).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('maskA', new THREE.BufferAttribute(MASK_A, 3, true));
geo.setAttribute('maskB', new THREE.BufferAttribute(MASK_B, 3, true));
geo.setAttribute('lid', new THREE.BufferAttribute(LID, 1, true));
// eye frame per dot: u across the eye (-1..1 between corners, 9 = not near an eye), v above/below the eye line
geo.setAttribute('eyeU', new THREE.BufferAttribute(EYE_U, 1));
geo.setAttribute('eyeV', new THREE.BufferAttribute(EYE_V, 1));
geo.setAttribute('rnd', new THREE.BufferAttribute(RND, 1));
// how much each dot turns with the head (0 = shoulders, 1 = head); the neck blends
const NECK_W = new Float32Array(N);
const NECK_PIVOT_Y = meta.chinY - 0.35;
let neckKey = null;
function buildNeck() {
  const bend = P.pose.neckBend; if (bend === neckKey) return; neckKey = bend;
  // smooth ramp from still (shoulders) to fully turned (head); Neck Bend widens the ramp.
  // No step anywhere, so a tilting head bends the neck instead of tearing the collar.
  const mid = NECK_PIVOT_Y + 0.15, half = 0.12 + 0.45 * bend;
  for (let i = 0; i < N; i++) {
    const t = Math.min(1, Math.max(0, (BASE[i * 3 + 1] - (mid - half)) / (2 * half)));
    NECK_W[i] = t * t * (3 - 2 * t);
  }
  geo.attributes.neckW.needsUpdate = true;
}
geo.setAttribute('neckW', new THREE.BufferAttribute(NECK_W, 1));
const mat = new THREE.ShaderMaterial({
  transparent: false, depthWrite: true,
  uniforms: {
    uSize: { value: 1 }, uPR: { value: renderer.getPixelRatio() }, uDot: { value: new THREE.Color() }, uAccent: { value: new THREE.Color() },
    uTex: { value: 0 }, uShade: { value: 0 }, uFade: { value: 0 }, uBg: { value: new THREE.Color() },
    uBlack: { value: 0.12 }, uWhite: { value: 0.57 }, uGamma: { value: 1 }, uFeatA: { value: new THREE.Vector3() }, uFeatB: { value: new THREE.Vector3() },
    uDepthSize: { value: 0 }, uDepthRange: { value: 0.6 }, uHeadZ: { value: -6 }, uInkSize: { value: 0 }, uRim: { value: 0 }, uThin: { value: 0 }, uEven: { value: 0 }, uLid: { value: 0 }, uEye: { value: new THREE.Vector4(0.03, 0.02, 1, 0) }, uEyeShape: { value: new THREE.Vector3(1, 0.35, 0.7) }, uOpacity: { value: 1 }, uLight: { value: new THREE.Vector3(0.3, 0.6, 0.75).normalize() }, uPoseRot: { value: new THREE.Matrix3() },
  },
  vertexShader: `
    attribute vec3 nrm, maskA, maskB; attribute float lum, heat, rnd, neckW, lid, eyeU, eyeV;
    uniform vec4 uEye; uniform vec3 uEyeShape;   // up, down, dark, - / width, softness, clear
    uniform mat3 uPoseRot;
    uniform float uSize, uPR, uTex, uShade, uFade, uBlack, uWhite, uGamma;
    uniform vec3 uLight, uFeatA, uFeatB;
    uniform float uDepthSize, uDepthRange, uHeadZ, uInkSize, uRim, uThin, uEven, uLid;
    varying float vInk, vHeat, vDrop;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;

      // 1. levels: black point, white point, gamma on the scan brightness
      float l = clamp((lum - uBlack) / max(uWhite - uBlack, 0.01), 0.0, 1.0);
      l = pow(l, uGamma);
      float ink = mix(1.0, 1.0 - 0.9 * l, uTex);
      // light from the upper front: shadowed sides thicken
      // surface direction follows the head pose and the view, so shading and rim
      // stay the same whichever way the head is turned
      vec3 n = normalize(normalMatrix * normalize(mix(nrm, uPoseRot * nrm, neckW)));
      float shade = max(dot(n, uLight), 0.0);   // light fixed to the viewer, upper front
      ink *= mix(1.0, 1.15 - 0.75 * shade, uShade);

      // 2 + 3. feature masks push their dots toward full ink
      vec3 fa = maskA * uFeatA, fb = maskB * uFeatB;
      float feat = max(max(max(fa.x, fa.y), fa.z), max(max(fb.x, fb.y), fb.z));
      ink = mix(ink, 1.0, feat);

      // 6. rim: surfaces turned sideways to the view go dark, outlining the head
      float facing = abs(dot(n, normalize(-mv.xyz)));
      ink = mix(ink, 1.0, uRim * smoothstep(0.45, 0.05, facing));

      // eyelids: the skin between brow and lash line goes light, so brows and eyes separate
      ink = mix(ink, 0.1, lid * uLid);

      // eye almond: dark inside, cleared just outside, so each emotion sets how open the eyes look
      if (eyeU < 8.0) {
        float u = eyeU / uEyeShape.x;
        float h = eyeV > 0.0 ? uEye.x : uEye.y;
        float lim = h * sqrt(max(1.0 - u * u, 0.0));
        float r = abs(eyeV) / max(lim, 1e-4);
        float inside = abs(u) < 1.0 ? 1.0 - smoothstep(1.0 - uEyeShape.y, 1.0, r) : 0.0;
        float zone = (1.0 - smoothstep(1.0, 1.25, abs(u))) * (1.0 - smoothstep(0.05, 0.09, abs(eyeV)));
        ink = mix(ink, 0.1, (1.0 - inside) * zone * uEyeShape.z);
        ink = mix(ink, 1.0, inside * uEye.z);
      }

      // depth fade: the far side of the head goes lighter
      float near = clamp((mv.z - uHeadZ) / uDepthRange, -1.5, 1.5);   // + toward the viewer
      ink *= mix(1.0, clamp(0.6 + 0.4 * near, 0.2, 1.0), uFade);

      // 4 + 5. size by depth and size by ink
      float sizeF = pow(2.0, near * uDepthSize) * mix(1.0, 0.45 + 1.2 * ink, uInkSize / 1.5 * 1.0);
      // even tone: surfaces turned away pack more dots per pixel and read darker,
      // so shrink those dots; head-on and turned views then read about the same
      sizeF *= mix(1.0, sqrt(max(facing, 0.15)) * 1.25, uEven);
      gl_PointSize = uSize * uPR * (3.0 / -mv.z) * sizeF;

      // 7. thin skin: drop a share of the light dots
      vDrop = (ink < 0.5 && rnd < uThin) ? 1.0 : 0.0;
      vInk = ink; vHeat = heat;
    }`,
  fragmentShader: `
    uniform vec3 uDot, uAccent, uBg; uniform float uOpacity;
    varying float vInk, vHeat, vDrop;
    void main() {
      if (vDrop > 0.5) discard;
      vec2 c = gl_PointCoord - 0.5; if (dot(c, c) > 0.25) discard;
      float heat = clamp(vHeat, 0.0, 1.0);
      vec3 col = mix(uDot, uAccent, heat);
      // opaque dots so the face hides the back of the head; ink mixes toward the page color
      gl_FragColor = vec4(mix(uBg, col, clamp(max(vInk, heat) * uOpacity, 0.0, 1.0)), 1.0);
    }`,
});
const cloud = new THREE.Points(geo, mat);
cloud.frustumCulled = false;
const world = new THREE.Group();
world.add(cloud);
scene.add(world);

// ---------- xyz map: three back walls with a grid and tick labels ----------
// Like a 3D plot: the walls on the far side of each axis show, so the head
// always sits in front of them as the view turns.
const gridMat = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.55 });
const axisMat = new THREE.LineBasicMaterial({ color: 0x555555 });
const grid = new THREE.Group();
world.add(grid);
let walls = {}, labelSprites = [], gridKey = '';

function textSprite(text) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 48;
  const g = c.getContext('2d');
  g.font = '500 26px "Instrument Sans", ui-sans-serif, sans-serif'; g.fillStyle = P.grid.color;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 24);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, transparent: true }));
  sp.scale.set(0.24, 0.09, 1);
  return sp;
}

function buildGrid() {
  grid.clear(); walls = {}; labelSprites = [];
  const E = P.grid.extent, st = P.grid.step, y0 = P.camera.crop, y1 = 1.0;
  const ticks = (a, b) => { const out = []; for (let t = Math.ceil(a / st) * st; t <= b + 1e-6; t += st) out.push(+t.toFixed(4)); return out; };
  const tx = ticks(-E, E), ty = ticks(y0, y1), tz = ticks(-E, E);
  const wall = (pts) => { const g = new THREE.BufferGeometry().setFromPoints(pts); return new THREE.LineSegments(g, gridMat); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const sx of [-1, 1]) {           // x walls (YZ planes)
    const p = []; const x = sx * E;
    for (const y of ty) p.push(V(x, y, -E), V(x, y, E));
    for (const z of tz) p.push(V(x, y0, z), V(x, y1, z));
    p.push(V(x, y0, -E), V(x, y0, E), V(x, y1, -E), V(x, y1, E), V(x, y0, -E), V(x, y1, -E), V(x, y0, E), V(x, y1, E));
    walls['x' + sx] = wall(p); grid.add(walls['x' + sx]);
  }
  for (const sz of [-1, 1]) {           // z walls (XY planes)
    const p = []; const z = sz * E;
    for (const y of ty) p.push(V(-E, y, z), V(E, y, z));
    for (const x of tx) p.push(V(x, y0, z), V(x, y1, z));
    p.push(V(-E, y0, z), V(E, y0, z), V(-E, y1, z), V(E, y1, z), V(-E, y0, z), V(-E, y1, z), V(E, y0, z), V(E, y1, z));
    walls['z' + sz] = wall(p); grid.add(walls['z' + sz]);
  }
  { const p = [];                       // floor
    for (const x of tx) p.push(V(x, y0, -E), V(x, y0, E));
    for (const z of tz) p.push(V(-E, y0, z), V(E, y0, z));
    walls.floor = wall(p); grid.add(walls.floor); }
  if (P.grid.labels) {
    const fmt = (t) => (t < 0 ? '\u2212' : '') + Math.abs(t).toFixed(2).replace(/0$/, '');
    for (const t of tx) labelSprites.push({ axis: 'x', t, sp: textSprite(fmt(t)) });
    for (const t of ty) labelSprites.push({ axis: 'y', t, sp: textSprite(fmt(t)) });
    for (const t of tz) labelSprites.push({ axis: 'z', t, sp: textSprite(fmt(t)) });
    for (const name of ['x', 'y', 'z']) { const sp = textSprite(name); sp.scale.multiplyScalar(1.2); labelSprites.push({ axis: name, t: null, sp }); }
    labelSprites.forEach(l => grid.add(l.sp));
  }
}

// show the far wall on each axis and park the labels on the near-bottom edges
const camLocal = new THREE.Vector3();
function updateGrid() {
  grid.visible = P.grid.show;
  if (!P.grid.show) return;
  const key = JSON.stringify([P.grid, P.camera.crop]);
  if (key !== gridKey) { gridKey = key; gridMat.color.set(P.grid.color); buildGrid(); }
  camLocal.copy(camera.position); world.worldToLocal(camLocal);
  const sx = camLocal.x > 0 ? -1 : 1, sz = camLocal.z > 0 ? -1 : 1;  // far side
  walls.x1.visible = sx === 1; walls['x-1'].visible = sx === -1;
  walls.z1.visible = sz === 1; walls['z-1'].visible = sz === -1;
  const E = P.grid.extent, y0 = P.camera.crop, pad = 0.14;
  for (const l of labelSprites) {
    if (l.axis === 'x') l.sp.position.set(l.t ?? 0, y0 - pad, -sz * (E + pad));
    if (l.axis === 'z') l.sp.position.set(-sx * (E + pad), y0 - pad, l.t ?? 0);
    if (l.axis === 'y') l.sp.position.set(-sx * (E + pad), l.t ?? (1.0 + pad * 1.5), sz * E);
    if (l.t === null) {
      if (l.axis === 'x') l.sp.position.set(E + pad * 2.5, y0 - pad, -sz * (E + pad));
      if (l.axis === 'z') l.sp.position.set(-sx * (E + pad), y0 - pad, -sz * (E + pad * 2.5));
    }
  }
}

// ---------- dials ----------
HeadDials.createDialRoot({ mode: 'inline', target: document.getElementById('dials'), theme: 'light' });
const dials = HeadDials.createDialKit('Head lab', CONFIG, { onAction });
dials.setValues(P);
let lastStage = P.stage, lastExprKey = '';
let OVR = {};   // hero overrides (embed mode); they win over the hidden panel's values
dials.subscribe((v) => {
  P = merge(P, v); if (EMBED) P = mergeDeep(P, OVR); save(); applyLook();
  const key = JSON.stringify([P.stage, P.expression]);
  if (key !== lastExprKey) { lastExprKey = key; buildTargets(); }
  lastStage = P.stage;
}, false);

// requestStage: the dots gather in for a beat (anticipation), then release into the new face
let pending = null, prevStage = null;
function requestStage(e) {
  if (e === P.stage || pending) return;
  if (REDUCED || P.mood.anticipation <= 0) { setStage(e); return; }
  LOOSE.fill(0); pending = { e, at: performance.now() };
}
function setStage(e) {
  pending = null; if (prevStage === null) prevStage = P.stage;
  P.stage = e; dials.setValues({ stage: e }); lastExprKey = ''; buildTargets(); save();
  LOOSE.fill(0);            // every scattered dot reforms straight into the new face
  progress = 0;
  startDecode(LABELS[e]);
}
function onAction(path) {
  if (path === 'next') requestStage(nextStage());
  if (path === 'intro') intro();
  if (path === 'scatter') scatter(0.6);
  if (path === 'grid.resetView' || path === 'resetView') { orbit.yaw = orbit.pitch = 0; }
  if (path.endsWith('strong')) {
    P.expression = merge(P.expression, { excited: 3, struggle: 3.5, breakthrough: 3, proud: 4, depthScale: 0.3,
      gains: { brows: 1.8, eyes: 1.4, mouth: 2, jaw: 1.6, rest: 1 } });
    dials.setValues({ expression: P.expression }); lastExprKey = ''; buildTargets(); save();
  }
  const preset = path.split('.').pop();
  if (preset in PRESETS) {
    P.readability = merge(P.readability, PRESETS[preset]);
    dials.setValues({ readability: P.readability }); save(); applyLook();
  }
}
const NEUTRAL_READ = {
  levels: { black: 0.12, white: 0.57, gamma: 1 },
  features: { eyes: 0, brows: 0, mouth: 0, beard: 0, hair: 0, notSkin: 0, lids: 0.85 },
  size: { byDepth: 0, depthRange: 0.6, byInk: 0 }, rim: 0, thinSkin: 0, evenTone: 0.6,
};
const PRESETS = {
  presetReset: NEUTRAL_READ,
  presetLevels: merge(NEUTRAL_READ, { levels: { black: 0.22, white: 0.5, gamma: 1.2 } }),
  presetFeatures: merge(NEUTRAL_READ, {
    levels: { black: 0.2, white: 0.52, gamma: 1.1 },
    features: { eyes: 1, brows: 1, mouth: 1, beard: 0.75, hair: 0.75, notSkin: 0, lids: 0.85 },
  }),
  presetDepth: merge(NEUTRAL_READ, { levels: { black: 0.18, white: 0.55, gamma: 1 }, size: { byDepth: 1.2, depthRange: 0.5, byInk: 0 } }),
  presetEngraving: merge(NEUTRAL_READ, {
    levels: { black: 0.2, white: 0.52, gamma: 1.1 },
    features: { eyes: 0.8, brows: 0.9, mouth: 0.8, beard: 0.4, hair: 0.4, notSkin: 0, lids: 0.85 },
    size: { byDepth: 0.4, depthRange: 0.6, byInk: 1.1 }, rim: 0.6, thinSkin: 0.55,
  }),
};
let jumpedOnce = false;
function nextStage() {
  const i = EMOTIONS.indexOf(P.stage);
  // "first swirl jumps to proud": only the very first advance after the page loads skips
  // to Proud; after that the full arc plays in order
  if (P.swirl.sequence === 'first swirl jumps to proud' && i === 0 && !jumpedOnce) { jumpedOnce = true; return 'proud'; }
  if (i === EMOTIONS.length - 1) return P.swirl.loop ? EMOTIONS[0] : P.stage;
  return EMOTIONS[i + 1];
}
function scatter(amount) {
  for (let i = 0; i < N * 3; i++) VEL[i] += (Math.random() - 0.5) * amount;
}
function intro() {
  // start on a loose shell around the head with a sideways push, so each dot curls in on an
  // arc instead of flying straight (arc paths, Animations lesson)
  for (let i = 0; i < N; i++) {
    const r = 2.2 + Math.random() * 1.6, t = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u);
    const x = r * s * Math.cos(t), y = r * u, z = r * s * Math.sin(t) - 0.6;
    POS[i * 3] = x; POS[i * 3 + 1] = y; POS[i * 3 + 2] = z;
    const swirl = P.view.introCurl * (0.7 + Math.random() * 0.6);
    VEL[i * 3] = -z * swirl; VEL[i * 3 + 1] = 0.01 * (Math.random() - 0.5); VEL[i * 3 + 2] = x * swirl;
  }
}

function applyLook() {
  const L = P.look;
  geo.setDrawRange(0, Math.min(N, L.points | 0));
  mat.uniforms.uSize.value = L.size;
  mat.uniforms.uDot.value.set(L.dot);
  mat.uniforms.uAccent.value.set(L.accent);
  mat.uniforms.uTex.value = L.texture;
  mat.uniforms.uShade.value = L.shade;
  mat.uniforms.uFade.value = L.depthFade;
  mat.uniforms.uOpacity.value = L.opacity;
  const Rd = P.readability, F = Rd.features;
  mat.uniforms.uBlack.value = Rd.levels.black; mat.uniforms.uWhite.value = Rd.levels.white; mat.uniforms.uGamma.value = Rd.levels.gamma;
  mat.uniforms.uFeatA.value.set(F.eyes, F.brows, F.mouth); mat.uniforms.uFeatB.value.set(F.beard, F.hair, F.notSkin);
  mat.uniforms.uDepthSize.value = Rd.size.byDepth; mat.uniforms.uDepthRange.value = Rd.size.depthRange; mat.uniforms.uInkSize.value = Rd.size.byInk;
  mat.uniforms.uRim.value = Rd.rim; mat.uniforms.uThin.value = Rd.thinSkin; mat.uniforms.uEven.value = Rd.evenTone; mat.uniforms.uLid.value = F.lids;
  renderer.setClearColor(L.background);
  mat.uniforms.uBg.value.set(L.background);
  document.documentElement.style.setProperty('--bg', L.background);

  camera.fov = P.camera.fov;
  resize();
}

// ---------- pointer ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.25);
const hit = new THREE.Vector3(), lastHit = new THREE.Vector3();
let pointer = { inside: false, hasLast: false, nx: 0, ny: 0 };

// ---------- mood: scratch progress, floating dots, scrambling word ----------
const LOOSE = new Float32Array(N);          // time (ms) until which each dot floats
// how much each dot belongs to the face: its total face-rig weight (eyes, nose, mouth, cheeks,
// beard; 0 for hair, ears, neck and shoulders). Only these dots count toward the mood bar.
const FACE_W = new Float32Array(N);
for (let i = 0; i < N; i++) { let t = 0; for (let k2 = 0; k2 < K; k2++) t += RIG_W[i * K + k2]; FACE_W[i] = Math.min(1, t * 1.25); }
let progress = 0, lastScratchAt = -1e9, lastFrameAt = performance.now(), progressAtStop = 0;
const moodEl = document.getElementById('mood'), moodFill = moodEl.querySelector('.fill'), moodLight = moodEl.querySelector('.txt.light');
const moodWords = moodEl.querySelectorAll('.word'), moodBrows = moodEl.querySelectorAll('.eyebrow');
const GLYPHS = { symbols: '#%&*+=/<>?!@$', letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', blocks: '\u2591\u2592\u2593\u2588\u2580\u2584\u258c\u2590' };
let word = LABELS[P.stage], decodeFrom = 0, decoding = false, lastGlyphAt = 0;
const glyph = () => { const g = GLYPHS[P.mood.glyphs] || GLYPHS.symbols; return g[(Math.random() * g.length) | 0]; };
// the word slot is sized to the real word (not the scrambled glyphs), so the pill and its
// progress fill fit each emotion and ease to the new width when the mood changes
function fitWord(w) {
  const el = moodWords[0]; if (!el) return;
  const c = fitWord.c || (fitWord.c = document.createElement('canvas').getContext('2d'));
  const cs = getComputedStyle(el); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const px = Math.ceil(c.measureText(w).width) + 1;
  moodWords.forEach(n => { n.style.width = px + 'px'; });
}
function startDecode(w) { word = w; decoding = true; decodeFrom = performance.now(); fitWord(w); setPhase(P.stage); }
// the phase swaps as the new word starts decoding: a quick fade out, then the new phase fades in at its own width
function fitPhase(t) {
  const el = moodBrows[0]; if (!el) return 0;
  const c = fitWord.c || (fitWord.c = document.createElement('canvas').getContext('2d'));
  const cs = getComputedStyle(el); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return Math.ceil(c.measureText(t).width) + 1;
}
let phaseTimer = 0;
function setPhase(stage, instant) {
  const t = PHASES[stage] || ''; clearTimeout(phaseTimer);
  const swap = () => moodBrows.forEach(n => { n.textContent = t; n.style.width = fitPhase(t) + 'px'; n.classList.remove('out'); });
  if (instant || REDUCED) { swap(); return; }
  moodBrows.forEach(n => n.classList.add('out'));
  phaseTimer = setTimeout(swap, 140);
}
document.fonts?.ready.then(() => { fitWord(word); setPhase(P.stage, true); });
setPhase(P.stage, true);
function setWord(text) { moodWords.forEach(el => { el.textContent = text; }); }
function updateMood(now) {
  moodEl.style.display = P.mood.show ? '' : 'none';
  moodEl.style.top = `${P.mood.top}%`;
  moodEl.style.setProperty('--fill', P.mood.fill);
  const pct = Math.min(100, progress * 100);
  moodFill.style.width = `${pct}%`;
  moodLight.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
  if (now - lastGlyphAt < 60) return;
  lastGlyphAt = now;
  if (decoding) {               // the next word resolves left to right
    const f = REDUCED ? 1 : Math.min(1, (now - decodeFrom) / P.mood.decode);
    const solved = Math.floor(f * word.length);
    setWord([...word].map((ch, i) => (i < solved ? ch : glyph())).join(''));
    if (f >= 1) { decoding = false; setWord(word); }
  } else {                      // letters break up as the bar fills
    const pr = Math.pow(progress, 1.4);
    setWord([...word].map(ch => (Math.random() < pr ? glyph() : ch)).join(''));
  }
}
const canvas = renderer.domElement;
let touchDown = false;
canvas.style.touchAction = 'none';
canvas.addEventListener('pointermove', (e) => {
  if (isTouch(e) && !touchDown) return;            // touch has no hover: scratch only while pressed
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  pointer.inside = true; pointer.nx = ndc.x; pointer.ny = ndc.y;
});
canvas.addEventListener('pointerleave', () => { if (!touchDown) { pointer.inside = false; pointer.hasLast = false; } });

// The view rests at a fixed angle (view.restYaw / restPitch) and sways gently. Dragging turns
// it, limited to view.dragYaw / dragPitch from rest; sway stops while you hold it and fades
// back in after you let go, as the view eases home. Double-click returns to rest.
const orbit = { yaw: 0, pitch: 0, curYaw: 0, curPitch: 0, dragging: false, x: 0, y: 0, releasedAt: -1e9, sway: 1 };
const clampOrbit = () => {
  const ly = P.view.dragYaw * Math.PI / 180, lp = P.view.dragPitch * Math.PI / 180;
  orbit.yaw = Math.max(-ly, Math.min(ly, orbit.yaw)); orbit.pitch = Math.max(-lp, Math.min(lp, orbit.pitch));
};
canvas.style.cursor = 'grab';
canvas.addEventListener('pointerdown', (e) => {
  if (REDUCED) { requestStage(nextStage()); return; }   // reduced motion: tap or click changes the mood
  if (isTouch(e)) { touchDown = true; try { canvas.setPointerCapture(e.pointerId); } catch {} pointer.hasLast = false; return; }
  orbit.dragging = true; orbit.x = e.clientX; orbit.y = e.clientY;
  canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (e) => {
  if (!orbit.dragging) return;
  orbit.yaw += (e.clientX - orbit.x) * 0.006;
  orbit.pitch += (e.clientY - orbit.y) * 0.006;
  clampOrbit();
  orbit.x = e.clientX; orbit.y = e.clientY;
});
const endDrag = () => { if (touchDown) { touchDown = false; pointer.inside = false; pointer.hasLast = false; } if (orbit.dragging) orbit.releasedAt = performance.now(); orbit.dragging = false; canvas.style.cursor = 'grab'; pointer.hasLast = false; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('dblclick', () => { orbit.yaw = orbit.pitch = 0; });
canvas.addEventListener('wheel', (e) => {
  if (!P.view.wheelZoom) return;
  e.preventDefault();
  const d = Math.max(2, Math.min(12, P.camera.distance * (1 + e.deltaY * 0.001)));
  P.camera.distance = d; dials.setValues({ camera: { ...P.camera, distance: d } }); save();
}, { passive: false });
const invWorld = new THREE.Matrix4();

// ---------- pose ----------
const poseNow = { pitch: 0, yaw: 0, roll: 0, forward: 0 }, poseVel = { pitch: 0, yaw: 0, roll: 0, forward: 0 };
const m = new THREE.Matrix4(), q = new THREE.Quaternion(), eul = new THREE.Euler();
const deg = Math.PI / 180;

// ---------- frame ----------
const sel = document.getElementById('sel'), selName = document.getElementById('sel-name'), selXyz = document.getElementById('sel-xyz');
const pivot = new THREE.Vector3(0, meta.chinY - 0.35, -0.3);
const v3 = new THREE.Vector3();

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
applyLook(); buildTargets();
// the head assembles as it appears; during the home intro it waits for the hand-off
if (P.view.introOnLoad && !REDUCED) {
  if (document.documentElement.dataset.intro === 'playing' || document.documentElement.classList.contains('intro-hold')) addEventListener('intro:handoff', () => intro());   // not once: the intro lab's Replay assembles it again
  else intro();
}

function frame(now) {
  requestAnimationFrame(frame);
  const C = P.camera;
  camera.position.set(C.offsetX, C.offsetY, C.distance); camera.lookAt(C.offsetX, C.offsetY, 0);
  camera.updateMatrixWorld();
  // rest angle + your drag (eased) + idle sway
  const V = P.view, D2R = Math.PI / 180;
  const idle = !orbit.dragging && (now - orbit.releasedAt) / 1000 > V.returnDelay;
  if (idle && V.returnToRest) { orbit.yaw *= 0.96; orbit.pitch *= 0.96; }
  orbit.sway += ((idle ? 1 : 0) - orbit.sway) * 0.02;
  orbit.curYaw += (orbit.yaw - orbit.curYaw) * 0.18;
  orbit.curPitch += (orbit.pitch - orbit.curPitch) * 0.18;
  const t = now / 1000 * V.swaySpeed * Math.PI * 2, sw = REDUCED ? 0 : orbit.sway;   // reduced motion: no sway
  const swYaw = Math.sin(t) * V.swayYaw * D2R * sw;
  const swPitch = Math.sin(t * 0.73 + 1.3) * V.swayPitch * D2R * sw;
  const swRoll = Math.sin(t * 0.51 + 2.1) * V.swayRoll * D2R * sw;
  world.rotation.set(V.restPitch * D2R + orbit.curPitch + swPitch, V.restYaw * D2R + orbit.curYaw + swYaw, swRoll, 'YXZ');
  world.position.y = Math.sin(t * 0.9 + 0.4) * V.bob * sw;
  world.updateMatrixWorld();
  updateGrid();

  // pose spring toward this emotion's pose, plus optional cursor follow
  const tp = P.pose[P.stage];
  const follow = P.follow.enabled && pointer.inside ? P.follow.amount : 0;
  const target = { pitch: tp.pitch + follow * pointer.ny * 0.6, yaw: tp.yaw + follow * pointer.nx, roll: tp.roll, forward: tp.forward };
  for (const k in poseNow) {
    if (REDUCED) { poseNow[k] = target[k]; poseVel[k] = 0; continue; }
    poseVel[k] += (target[k] - poseNow[k]) * P.reform.poseStiffness - poseVel[k] * P.reform.poseDamping;
    poseNow[k] += poseVel[k];
  }
  eul.set(-poseNow.pitch * deg, poseNow.yaw * deg, poseNow.roll * deg, 'YXZ'); q.setFromEuler(eul);
  m.makeRotationFromQuaternion(q);
  buildNeck();
  mat.uniforms.uPoseRot.value.setFromMatrix4(m);
  { const E = P.eyes[P.stage], u = mat.uniforms.uEye.value, k = 0.12;   // ease toward this emotion's eyes
    u.x += (E.up - u.x) * k; u.y += (E.down - u.y) * k; u.z += (E.dark - u.z) * k;
    mat.uniforms.uEyeShape.value.set(P.eyes.width, P.eyes.softness, P.eyes.clearAround); }
  // depth is measured from the posed head's center, not a fixed point on the map
  v3.set(0, -0.05, 0.15).sub(pivot).applyMatrix4(m).add(pivot);
  v3.z += poseNow.forward;
  v3.applyMatrix4(world.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
  mat.uniforms.uHeadZ.value = v3.z;
  const e = m.elements, bend = P.pose.neckBend;
  const yLo = pivot.y - 0.2, yHi = pivot.y + 0.45;

  // swirl input
  let sx = 0, sy = 0, mvx = 0, mvy = 0, speed = 0, swirling = false;
  if (pointer.inside && !orbit.dragging) {
    ray.setFromCamera(ndc, camera);
    invWorld.copy(world.matrixWorld).invert();
    ray.ray.applyMatrix4(invWorld);   // swirl happens in model space
    if (ray.ray.intersectPlane(plane, hit)) {
      if (pointer.hasLast) { mvx = hit.x - lastHit.x; mvy = hit.y - lastHit.y; speed = Math.hypot(mvx, mvy); }
      lastHit.copy(hit); pointer.hasLast = true; sx = hit.x; sy = hit.y;
      swirling = speed > 0.0005 && Math.abs(sx) < 0.75 && sy > P.camera.crop && sy < 1.1;
    }
  }
  const S = P.swirl, R = S.radius, R2 = R * R, gain = S.strength * 3;
  const M = P.mood, dt = Math.min(0.05, (now - lastFrameAt) / 1000); lastFrameAt = now;
  const floatMs = M.floatTime * 1000, rampMs = M.returnRamp * 1000;
  let scratch = 0;   // how hard the swirl pushed head dots this frame

  // anticipation: while a stage change is pending, pull the face in a little, then release it
  // into the new face (the switch happens when the gather time is up)
  let gather = 0;
  if (pending) {
    const gp = Math.min(1, (now - pending.at) / M.gatherMs);
    gather = (1 - Math.pow(1 - gp, 3)) * M.anticipation;
    if (gp >= 1) { setStage(pending.e); gather = 0; }
  }

  // integrate
  const k = P.reform.stiffness, c = P.reform.damping, crop = P.camera.crop, n = Math.min(N, P.look.points | 0);
  for (let i = 0; i < n; i++) {
    const j = i * 3;
    let tx = FACE_T[j], ty = FACE_T[j + 1], tz = FACE_T[j + 2];
    // pose about the neck pivot; the neck blends from still to fully turned
    const by = BASE[j + 1];
    const wn = NECK_W[i];
    if (wn > 0) {
      const px = tx - pivot.x, py = ty - pivot.y, pz = tz - pivot.z;
      const rx = e[0] * px + e[4] * py + e[8] * pz + pivot.x;
      const ry = e[1] * px + e[5] * py + e[9] * pz + pivot.y;
      const rz = e[2] * px + e[6] * py + e[10] * pz + pivot.z + poseNow.forward;
      tx += (rx - tx) * wn; ty += (ry - ty) * wn; tz += (rz - tz) * wn;
    }
    if (gather > 0 && wn > 0.5) { tx += (0 - tx) * gather; ty += (0.05 - ty) * gather; tz += (0.1 - tz) * gather; }
    if (REDUCED) {   // reduced motion: dots sit exactly on the face, changes are instant
      POS[j] = tx; POS[j + 1] = BASE[j + 1] < crop ? -99 : ty; POS[j + 2] = tz; VEL[j] = VEL[j + 1] = VEL[j + 2] = 0; continue;
    }
    let vx = VEL[j], vy = VEL[j + 1], vz = VEL[j + 2];
    if (swirling && !REDUCED) {
      const dx = POS[j] - sx, dy = POS[j + 1] - sy, d2 = dx * dx + dy * dy;
      if (d2 < R2) {
        const d = Math.sqrt(d2) + 1e-5, f = (1 - d / R) ** 2 * gain;
        const ux = dx / d, uy = dy / d, side = Math.sign(mvx * uy - mvy * ux) || 1;
        vx += f * (S.curl * -uy * side * speed + S.drag * mvx + S.push * ux * speed);
        vy += f * (S.curl * ux * side * speed + S.drag * mvy + S.push * uy * speed);
        vz += f * S.depth * (Math.random() - 0.5) * speed * 4;
        if (f > HEAT[i]) HEAT[i] = Math.min(1, f);
        scratch += f * speed * FACE_W[i];               // only the face counts toward the mood
        if (f > 0.05) LOOSE[i] = now + floatMs;         // touched dots float for a while
      }
    }
    // floating: the spring nearly lets go, then ramps back once the float time is up
    let kk = gather > 0 ? k * 1.6 : k, cc = c;
    const since = now - LOOSE[i];
    if (since < rampMs) {
      const r = since < 0 ? 0 : since / rampMs, ease = r * r * (3 - 2 * r);
      kk = k * (0.03 + 0.97 * ease); cc = Math.min(0.9, c * (3 - 2 * ease));   // heavy drag: pushed dots stop and hang
      if (since < 0 && M.drift > 0) {
        const ph = now * 0.0012 + RND[i] * 40;
        vx += Math.sin(ph) * 0.0004 * M.drift; vy += Math.cos(ph * 1.3) * 0.0004 * M.drift; vz += Math.sin(ph * 0.7) * 0.0003 * M.drift;
      }
    }
    vx += (tx - POS[j]) * kk - vx * cc; vy += (ty - POS[j + 1]) * kk - vy * cc; vz += (tz - POS[j + 2]) * kk - vz * cc;
    VEL[j] = vx; VEL[j + 1] = vy; VEL[j + 2] = vz;
    POS[j] += vx; POS[j + 1] += vy; POS[j + 2] += vz;
    HEAT[i] *= 0.95;
    if (BASE[j + 1] < crop) POS[j + 1] = -99; // cropped below the line
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.heat.needsUpdate = true;

  // mood progress: earned by scratching the face
  // calibrated so threshold 6 takes about 3s of steady scratching across the face
  // the bar follows the dots: it holds while the scratched dots float, then empties on the
  // same curve as their return (return ramp plus the spring settling)
  if (scratch > 0.05) { progress += Math.min(0.02, scratch / (M.threshold * 3000)); lastScratchAt = now; progressAtStop = progress; }
  else {
    const back = (now - lastScratchAt - floatMs) / (rampMs + 600);
    if (back > 0) { const r = Math.min(1, back), ease = r * r * (3 - 2 * r); progress = progressAtStop * (1 - ease); }
  }
  if (progress >= 1 && !decoding && !pending) {
    const nx = nextStage();
    if (nx !== P.stage) requestStage(nx); else progress = 1;
  }
  updateMood(now);
  window.__mood = { progress, scratch };   // read by the lab's own checks
  renderer.render(scene, camera);

  // selection box around the head, with the stage name and cursor coordinates
  if (P.overlay.selection) {
    const r = canvas.getBoundingClientRect();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [bx, by, bz] of [[-0.72, 0.85, 0.3], [0.72, 0.85, 0.3], [-0.72, crop, 0.3], [0.72, crop, 0.3]]) {
      v3.set(bx, by, bz).applyMatrix4(world.matrixWorld).project(camera);
      const px = (v3.x + 1) / 2 * r.width, py = (1 - v3.y) / 2 * r.height;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    Object.assign(sel.style, { display: 'block', left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
    selName.parentElement.style.display = P.mood.nameTag ? '' : 'none';
    selName.textContent = LABELS[P.stage];
    selXyz.textContent = P.overlay.coords && pointer.hasLast ? `x ${hit.x.toFixed(3)}  y ${hit.y.toFixed(3)}  z ${hit.z.toFixed(3)}` : '';
  } else sel.style.display = 'none';
}
requestAnimationFrame(frame);

if (EMBED) {
  addEventListener('message', (e) => {
    if (e.data?.type !== 'head-params') return;
    OVR = mergeDeep(OVR, e.data.params);
    P = mergeDeep(P, OVR); applyLook();
  });
  parent.postMessage({ type: 'head-ready' }, '*');
}
