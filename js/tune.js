/* ============================================================
   tune.js — DialKit panel for the bubble preview crops.
   Open a stage page with ?tune (e.g. /?tune or /fun-zone?tune).
   Each bubble gets x / y (crop focus, 0..1) and zoom (1 = cover).
   "Copy config" puts a JSON block on the clipboard; paste each
   entry's focus / zoom onto the matching item in js/data.js.
   ============================================================ */
import { useDialKit } from "./tuner.js";
import { PROJECTS, FUN } from "./data.js";

export function mountTuner(router) {
  const all = [...PROJECTS.map((i) => [i, "projects"]), ...FUN.map((i) => [i, "fun"])];
  const current = router.current?.section;

  const config = {};
  for (const [item, section] of all) {
    config[item.slug] = {
      __open: section === current,
      x:    [item.focus[0], 0, 1],
      y:    [item.focus[1], 0, 1],
      zoom: [item.zoom ?? 1, 0.8, 2.5],
    };
  }
  config.copy = { type: "action", label: "Copy config" };
  config.reset = { type: "action", label: "Reset" };

  const params = useDialKit("Bubble Previews", config, {
    onChange: (p) => apply(p),
    onAction: (name, p) => {
      if (name === "reset") p.__reset();
      if (name === "copy") {
        const out = {};
        for (const [item] of all) out[item.slug] = { focus: [p[item.slug].x, p[item.slug].y], zoom: p[item.slug].zoom };
        const text = JSON.stringify(out, null, 2);
        navigator.clipboard?.writeText(text).then(() => p.__toast("Config copied"), () => p.__toast("Clipboard blocked — see console"));
        console.log("%cBubble Previews config", "font-weight:700", "\n" + text);
      }
    },
  });

  let pending = null;
  function apply(p) {
    for (const [item] of all) {
      const v = p[item.slug];
      item.focus = [v.x, v.y];
      item.zoom = v.zoom;
    }
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = null; const page = router.current; if (page?.kind === "stage") page.retune(); });
  }
  apply(params);
  console.info("DialKit: preview tuner mounted. Double-click a slider to reset it.");
  return params;
}
