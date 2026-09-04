/* ============================================================
   tune.js — DialKit panel for bubble shadow + ring spacing.
   Open a stage page with ?tune (e.g. /fun-zone?tune).
   "Copy config" puts the values on the clipboard; paste them over
   the --bubble-* tokens in css/tokens.css and STAGE_DEFAULTS in
   js/pages/stage.js to bake them in.
   ============================================================ */
import { useDialKit } from "./tuner.js";
import { STAGE_DEFAULTS, setStage } from "./pages/stage.js";

export function mountTuner(router) {
  const root = document.documentElement;
  const params = useDialKit("Bubble Shadows", {
    projectsShadow: {
      offsetY: [32.5, 0, 80],        // how far the cast shadow drops
      blur:    [26, 0, 120],
      spread:  [-25.5, -60, 20],     // negative hides the shadow behind the circle
      opacity: [0.06, 0, 1],
      ringBlur:    [5, 0, 24],       // tight ambient shadow around the circle
      ringOpacity: [0.05, 0, 0.4],
    },
    funShadow: {
      offsetY: [32.5, 0, 80],
      blur:    [34, 0, 120],
      spread:  [-25.5, -60, 20],
      opacity: [0.6, 0, 1],
      ringBlur:    [5, 0, 24],
      ringOpacity: [0.05, 0, 0.4],
    },
    spacing: {
      ringDiamond:    [STAGE_DEFAULTS.ringDiamond, 0.15, 0.5],   // Fun Zone ring radius (× stage height)
      centerDiamond:  [STAGE_DEFAULTS.centerDiamond, 0.3, 0.7],
      ringPentagon:   [STAGE_DEFAULTS.ringPentagon, 0.15, 0.5],  // Projects ring radius
      centerPentagon: [STAGE_DEFAULTS.centerPentagon, 0.3, 0.7],
      sizeH:          [STAGE_DEFAULTS.sizeH, 0.15, 0.5],         // bubble diameter (× stage height)
    },
    copy:  { type: "action", label: "Copy config" },
    reset: { type: "action", label: "Reset" },
  }, {
    onChange: (p, path) => apply(p, path[0]),
    onAction: (name, p) => {
      if (name === "reset") p.__reset();
      if (name === "copy") {
        const text = JSON.stringify({ tokens: tokens(p), STAGE_DEFAULTS: { ...STAGE_DEFAULTS, ...p.spacing } }, null, 2);
        navigator.clipboard?.writeText(text).then(() => p.__toast("Config copied"), () => p.__toast("Clipboard blocked — see console"));
        console.log("%cBubbles config", "font-weight:700", "\n" + text);
      }
    },
  });

  const shadowTokens = (prefix, s) => ({
    [`--${prefix}-shadow-y`]: s.offsetY + "px",
    [`--${prefix}-shadow-blur`]: s.blur + "px",
    [`--${prefix}-shadow-spread`]: s.spread + "px",
    [`--${prefix}-shadow-alpha`]: s.opacity,
    [`--${prefix}-ring-blur`]: s.ringBlur + "px",
    [`--${prefix}-ring-alpha`]: s.ringOpacity,
  });
  const tokens = (p) => ({ ...shadowTokens("bubble", p.projectsShadow), ...shadowTokens("fun", p.funShadow) });

  let pending = null;
  function apply(p, group) {
    for (const [k, v] of Object.entries(tokens(p))) root.style.setProperty(k, v);
    setStage(p.spacing);
    if (group && group !== "spacing") return;
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = null; const page = router.current; if (page?.kind === "stage") page.retune(); });
  }
  apply(params);
  console.info("DialKit: tuning panel mounted. Double-click a slider to reset it.");
  return params;
}
