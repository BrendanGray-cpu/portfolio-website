/* ============================================================
   tune.js — DialKit panel for the glass bubbles.
   Open any stage page with ?tune (e.g. /?tune or /fun-zone?tune).
   "Copy config" puts a JSON block on the clipboard; paste its
   values over GLASS_DEFAULTS (glass.js), STAGE_DEFAULTS
   (pages/stage.js) and the --bubble-* / --spring-bouncy tokens
   (tokens.css) to bake a look in.
   ============================================================ */
import { useDialKit, springToLinear } from "./tuner.js";
import { GLASS, GLASS_DEFAULTS, setGlass } from "./glass.js";
import { STAGE, STAGE_DEFAULTS, setStage } from "./pages/stage.js";

export function mountTuner(router) {
  const root = document.documentElement;

  const params = useDialKit("Glass Bubbles", {
    lens: {
      bend:     [GLASS_DEFAULTS.bend, 0, 1.2],       // refraction at the rim
      falloff:  [GLASS_DEFAULTS.bendPow, 1, 12],     // higher = tighter to the edge
      chroma:   [GLASS_DEFAULTS.chroma, 0, 0.12],    // RGB split
      zoom:     [GLASS_DEFAULTS.zoom, 0.6, 1.8],     // crop zoom (1 = cover)
    },
    rim: {
      start:      [GLASS_DEFAULTS.rimStart, 0.5, 1],
      dark:       [GLASS_DEFAULTS.rimDark, 0, 1],
      bottom:     [GLASS_DEFAULTS.rimBottom, 0, 1.5],
      edgeStart:  [GLASS_DEFAULTS.edgeStart, 0.85, 1],
      edgeDark:   [GLASS_DEFAULTS.edgeDark, 0, 1],
      edgeBottom: [GLASS_DEFAULTS.edgeBottom, 0, 1],
    },
    light: {
      specular:   [GLASS_DEFAULTS.spec, 0, 0.8],
      specInner:  [GLASS_DEFAULTS.specInner, 0.5, 0.95],
      angle:      [GLASS_DEFAULTS.lightAngle, 0, 360],  // 90 = top, 180 = left
      body:       [GLASS_DEFAULTS.body, 0, 0.12],
    },
    layout: {
      __open: false,
      sizeH:          [STAGE_DEFAULTS.sizeH, 0.15, 0.5],
      sizeW:          [STAGE_DEFAULTS.sizeW, 0.1, 0.3],
      ringPentagon:   [STAGE_DEFAULTS.ringPentagon, 0.2, 0.5],
      ringDiamond:    [STAGE_DEFAULTS.ringDiamond, 0.2, 0.5],
      centerPentagon: [STAGE_DEFAULTS.centerPentagon, 0.3, 0.7],
      centerDiamond:  [STAGE_DEFAULTS.centerDiamond, 0.3, 0.7],
    },
    gravity: {
      __open: false,
      leash:    [STAGE_DEFAULTS.leash, 0, 140],
      strength: [STAGE_DEFAULTS.strength, 0, 0.6],
      ease:     [STAGE_DEFAULTS.ease, 0.02, 0.4],
    },
    hover: {
      __open: false,
      scale:       [1.12, 1, 1.5],
      labelOffset: [16, 0, 48],
      spring: { type: "spring", stiffness: 300, damping: 18 },
    },
    shadow: {
      __open: false,
      offsetY: [18, 0, 60],
      blur:    [40, 0, 120],
      opacity: [0.35, 0, 1],
    },
    copy:  { type: "action", label: "Copy config" },
    reset: { type: "action", label: "Reset" },
  }, {
    onChange: (p, path) => apply(p, path[0]),
    onAction: (name, p) => {
      if (name === "reset") p.__reset();
      if (name === "copy") {
        const spring = springToLinear(p.hover.spring.stiffness, p.hover.spring.damping);
        const out = {
          GLASS_DEFAULTS: glassFrom(p),
          STAGE_DEFAULTS: stageFrom(p),
          tokens: {
            "--bubble-hover": p.hover.scale,
            "--label-offset": p.hover.labelOffset + "px",
            "--bubble-shadow-y": p.shadow.offsetY + "px",
            "--bubble-shadow-blur": p.shadow.blur + "px",
            "--bubble-shadow-alpha": p.shadow.opacity,
            "--d-spring": spring.duration + "ms",
            "--spring-bouncy": spring.css,
          },
        };
        const text = JSON.stringify(out, null, 2);
        navigator.clipboard?.writeText(text).then(() => p.__toast("Config copied"), () => p.__toast("Clipboard blocked — see console"));
        console.log("%cGlass Bubbles config", "font-weight:700", "\n" + text);
      }
    },
  });

  const glassFrom = (p) => ({
    bend: p.lens.bend, bendPow: p.lens.falloff, chroma: p.lens.chroma, zoom: p.lens.zoom,
    rimStart: p.rim.start, rimDark: p.rim.dark, rimBottom: p.rim.bottom,
    edgeStart: p.rim.edgeStart, edgeDark: p.rim.edgeDark, edgeBottom: p.rim.edgeBottom,
    spec: p.light.specular, specInner: p.light.specInner, lightAngle: p.light.angle, body: p.light.body,
  });
  const stageFrom = (p) => ({ ...p.layout, ...p.gravity });

  let pending = null;
  function apply(p, group) {
    setGlass(glassFrom(p));
    setStage(stageFrom(p));
    root.style.setProperty("--bubble-hover", p.hover.scale);
    root.style.setProperty("--label-offset", p.hover.labelOffset + "px");
    root.style.setProperty("--bubble-shadow-y", p.shadow.offsetY + "px");
    root.style.setProperty("--bubble-shadow-blur", p.shadow.blur + "px");
    root.style.setProperty("--bubble-shadow-alpha", p.shadow.opacity);
    const s = springToLinear(p.hover.spring.stiffness, p.hover.spring.damping);
    root.style.setProperty("--spring-bouncy", s.css);
    root.style.setProperty("--d-spring", s.duration + "ms");
    // re-render bubbles at most once per frame
    if (group === "hover" || group === "shadow") return;
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = null; const page = router.current; if (page?.kind === "stage") page.retune(); });
  }
  apply(params);
  console.info("DialKit: tuning panel mounted. Double-click a slider to reset it.");
  return params;
}
