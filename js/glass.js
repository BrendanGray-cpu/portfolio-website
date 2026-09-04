/* ============================================================
   glass.js — refractive glass lens renderer.
   One shared offscreen WebGL canvas renders a screenshot through
   a lens shader (edge refraction, chromatic split, rim shadow,
   specular arc). The result is copied into any 2D <canvas>, so
   there is no per-bubble GL context and the morph can re-render
   every frame with a relaxing strength.
   ============================================================ */

const VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_texAspect;   // image w/h
uniform float u_aspect;      // element w/h
uniform vec2  u_focus;       // crop focus, 0..1, y down
uniform float u_strength;    // 0 flat → 1 full glass
uniform float u_shape;       // 0 circle → 1 rounded rect
uniform float u_radius;      // corner radius / half height
uniform float u_zoom;        // 1 = cover
uniform float u_aa;          // anti-alias width in sdf units
// tunable look (see GLASS_DEFAULTS)
uniform float u_bend;        // refraction amount at the rim
uniform float u_bendPow;     // how tightly refraction hugs the rim
uniform float u_chroma;      // chromatic split of the refraction
uniform float u_rimStart;    // where the dark rim begins (0..1 radius)
uniform float u_rimDark;     // rim darkness at the top
uniform float u_rimBottom;   // extra rim darkness at the bottom
uniform float u_edgeStart;   // where the thin edge line begins
uniform float u_edgeDark;    // edge line darkness
uniform float u_edgeBottom;  // extra edge darkness at the bottom
uniform float u_spec;        // specular intensity
uniform float u_specInner;   // inner radius of the specular arc
uniform vec2  u_lightDir;    // light direction (unit vector)
uniform float u_body;        // soft body light

float sdRRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec2 cover(vec2 uv) {
  vec2 s = vec2(1.0);
  if (u_texAspect > u_aspect) s.x = u_aspect / u_texAspect; else s.y = u_texAspect / u_aspect;
  s /= u_zoom;
  vec2 f = vec2(u_focus.x, 1.0 - u_focus.y);
  vec2 c = clamp(f, s * 0.5, 1.0 - s * 0.5);
  return c + (uv - 0.5) * s;
}

void main() {
  vec2 p = v_uv * 2.0 - 1.0;
  vec2 q = vec2(p.x * u_aspect, p.y);
  float dC = length(p) - 1.0;
  float dR = sdRRect(q, vec2(u_aspect, 1.0), u_radius);
  float d = mix(dC, dR, u_shape);
  float nr = clamp(1.0 + d, 0.0, 1.0);

  // Convex-lens refraction: flat in the middle, content compresses
  // sharply in the outer ring like a thick glass edge.
  float bend = u_strength * u_bend * pow(nr, u_bendPow);
  vec2 dir = p * 0.5;
  vec2 uvR = cover(v_uv - dir * bend * (1.0 + u_chroma));
  vec2 uvG = cover(v_uv - dir * bend);
  vec2 uvB = cover(v_uv - dir * bend * (1.0 - u_chroma));
  vec3 col = vec3(texture2D(u_tex, uvR).r, texture2D(u_tex, uvG).g, texture2D(u_tex, uvB).b);

  // Glass thickness: dark rim, heavier at the bottom.
  float rim = smoothstep(u_rimStart, 1.0, nr);
  float bottom = clamp(0.5 - p.y * 0.5, 0.0, 1.0);
  float dark = pow(rim, 1.6) * (u_rimDark + u_rimBottom * bottom * bottom) * u_strength;
  // a thin, darker glass edge right at the boundary
  dark += smoothstep(u_edgeStart, 1.0, nr) * (u_edgeDark + u_edgeBottom * bottom) * u_strength;
  col *= 1.0 - clamp(dark, 0.0, 0.92);

  // Specular arc from the light direction.
  float ang = dot(normalize(p + vec2(1e-4)), u_lightDir);
  float specOuter = u_specInner + (0.93 - 0.78);
  float spec = smoothstep(0.3, 1.0, ang) * smoothstep(u_specInner, specOuter, nr) * (1.0 - smoothstep(0.95, 1.0, nr));
  col += spec * u_spec * u_strength;

  // Soft body light: slight lift in the centre and toward the top.
  col += (u_body * (1.0 - nr) + u_body * (p.y * 0.5 + 0.5)) * u_strength;

  float alpha = 1.0 - smoothstep(-u_aa, u_aa, d);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

/* ---------- tunable look (edit here or via /?tune) ---------- */
export const GLASS_DEFAULTS = {
  bend: 0.5,        // refraction amount at the rim
  bendPow: 5,       // how tightly the refraction hugs the rim
  chroma: 0.03,     // chromatic split
  zoom: 1,          // 1 = cover crop
  rimStart: 0.84,   // dark rim begins at this radius
  rimDark: 0.18,    // rim darkness (top)
  rimBottom: 0.72,  // extra darkness at the bottom
  edgeStart: 0.965, // thin edge line begins
  edgeDark: 0.15,
  edgeBottom: 0.35,
  spec: 0.22,       // specular intensity
  specInner: 0.78,  // inner radius of the specular arc
  lightAngle: 123,  // degrees; 90 = top, 180 = left
  body: 0.02,       // soft body light
};
/** Live params. Mutate via setGlass(); every later draw uses them. */
export const GLASS = { ...GLASS_DEFAULTS };
export function setGlass(partial) { Object.assign(GLASS, partial); }

class GlassGL {
  /** @param {HTMLCanvasElement} [canvas] render directly into this canvas (no copy) */
  constructor(canvas) {
    this.direct = !!canvas;
    this.canvas = canvas || document.createElement("canvas");
    const opts = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: !this.direct };
    this.gl = this.canvas.getContext("webgl2", opts) || this.canvas.getContext("webgl", opts);
    if (!this.gl) throw new Error("no webgl");
    const gl = this.gl;
    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(prog, s);
    }
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ["u_tex", "u_texAspect", "u_aspect", "u_focus", "u_strength", "u_shape", "u_radius", "u_zoom", "u_aa",
      "u_bend", "u_bendPow", "u_chroma", "u_rimStart", "u_rimDark", "u_rimBottom", "u_edgeStart", "u_edgeDark", "u_edgeBottom",
      "u_spec", "u_specInner", "u_lightDir", "u_body"]) {
      this.u[n] = gl.getUniformLocation(prog, n);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.textures = new Map();
    this.canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.lost = true; });
  }

  /** Upload an image as a 1024² power-of-two texture (stretched; UVs are normalised). */
  texture(img) {
    const key = img.currentSrc || img.src;
    if (this.textures.has(key)) return this.textures.get(key);
    const gl = this.gl;
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, size, size);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    const entry = { tex, aspect: (img.naturalWidth || 1) / (img.naturalHeight || 1) };
    this.textures.set(key, entry);
    return entry;
  }

  /** Render into this instance's own canvas (for direct contexts). */
  render(img, o = {}) {
    if (this.lost) return false;
    const gl = this.gl;
    const w = this.canvas.width, hgt = this.canvas.height;
    gl.viewport(0, 0, w, hgt);
    this._draw(img, o, w, hgt);
    return true;
  }

  /**
   * Render into a 2D canvas (copies from the shared GL canvas).
   * @param {HTMLCanvasElement} target  2D canvas; its width/height are the buffer size
   * @param {HTMLImageElement} img      decoded source image
   * @param {object} o  { strength, shape, radius, aspect, focus, zoom }
   */
  draw(target, img, o = {}) {
    if (this.lost) return false;
    const gl = this.gl;
    const w = target.width, hgt = target.height;
    if (this.canvas.width !== w || this.canvas.height !== hgt) { this.canvas.width = w; this.canvas.height = hgt; }
    gl.viewport(0, 0, w, hgt);
    this._draw(img, o, w, hgt);
    const ctx = target.getContext("2d");
    ctx.clearRect(0, 0, w, hgt);
    ctx.drawImage(this.canvas, 0, 0, w, hgt);
    return true;
  }

  _draw(img, o, w, hgt) {
    const gl = this.gl;
    const t = this.texture(img);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform1i(this.u.u_tex, 0);
    gl.uniform1f(this.u.u_texAspect, t.aspect);
    gl.uniform1f(this.u.u_aspect, o.aspect ?? 1);
    gl.uniform2f(this.u.u_focus, o.focus?.[0] ?? 0.5, o.focus?.[1] ?? 0.5);
    gl.uniform1f(this.u.u_strength, o.strength ?? 1);
    gl.uniform1f(this.u.u_shape, o.shape ?? 0);
    gl.uniform1f(this.u.u_radius, o.radius ?? 0);
    const P = GLASS;
    gl.uniform1f(this.u.u_zoom, o.zoom ?? P.zoom);
    gl.uniform1f(this.u.u_bend, P.bend);
    gl.uniform1f(this.u.u_bendPow, P.bendPow);
    gl.uniform1f(this.u.u_chroma, P.chroma);
    gl.uniform1f(this.u.u_rimStart, P.rimStart);
    gl.uniform1f(this.u.u_rimDark, P.rimDark);
    gl.uniform1f(this.u.u_rimBottom, P.rimBottom);
    gl.uniform1f(this.u.u_edgeStart, P.edgeStart);
    gl.uniform1f(this.u.u_edgeDark, P.edgeDark);
    gl.uniform1f(this.u.u_edgeBottom, P.edgeBottom);
    gl.uniform1f(this.u.u_spec, P.spec);
    gl.uniform1f(this.u.u_specInner, P.specInner);
    const la = (P.lightAngle * Math.PI) / 180;
    gl.uniform2f(this.u.u_lightDir, Math.cos(la), Math.sin(la));
    gl.uniform1f(this.u.u_body, P.body);
    gl.uniform1f(this.u.u_aa, o.aa ?? 2.5 / Math.min(w, hgt));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    const gl = this.gl;
    for (const t of this.textures.values()) gl.deleteTexture(t.tex);
    this.textures.clear();
    const ext = gl.getExtension("WEBGL_lose_context");
    if (ext) ext.loseContext();
  }
}

import { NO_GL } from "./util.js";

let shared = null;
let failed = NO_GL;
export function glass() {
  if (shared || failed) return shared;
  try { shared = new GlassGL(); } catch (e) { failed = true; console.warn("Glass: WebGL unavailable, using CSS fallback.", e); }
  return shared;
}
export const hasGlass = () => !!glass();

/** A dedicated, direct-rendering context for one canvas (used by the morph). */
export function directGlass(canvas) {
  if (failed) return null;
  try { return new GlassGL(canvas); } catch (e) { return null; }
}

/** Buffer size for a square bubble of `px` CSS pixels. */
export function bufferSize(px) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return Math.round(px * dpr);
}
