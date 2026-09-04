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
  const params = useDialKit("Bubbles", {
    shadow: {
      offsetY: [28.5, 0, 80],        // how far the cast shadow drops
      blur:    [18, 0, 120],
      spread:  [-28.5, -60, 20],     // negative hides the shadow behind the circle
      opacity: [0.16, 0, 0.6],
    },
    ring: {                          // tight ambient shadow around the whole circle
      blur:    [2, 0, 24],
      opacity: [0.06, 0, 0.4],
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

  const tokens = (p) => ({
    "--bubble-shadow-y": p.shadow.offsetY + "px",
    "--bubble-shadow-blur": p.shadow.blur + "px",
    "--bubble-shadow-spread": p.shadow.spread + "px",
    "--bubble-shadow-alpha": p.shadow.opacity,
    "--bubble-ring-blur": p.ring.blur + "px",
    "--bubble-ring-alpha": p.ring.opacity,
  });

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
