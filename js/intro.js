/* ============================================================
   intro.js — "Hey, I'm  Brendan Gray" opening beat.
   Plays once per browser session on "/" (never on deep links,
   never with reduced motion). Skippable with Escape or a click.
   ============================================================ */
import { h, RM, sleep } from "./util.js";

const KEY = "bg-intro-seen";
const EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 0.85, 0.35)";

export function shouldPlayIntro(path) {
  if (RM || path !== "/") return false;
  const force = new URLSearchParams(location.search).has("intro");
  if (force) return true;
  try { return !sessionStorage.getItem(KEY); } catch (_) { return true; }
}
export function markIntroSeen() {
  try { sessionStorage.setItem(KEY, "1"); } catch (_) {}
}

export function playIntro() {
  const hey = h("p.intro__hey", "Hey, I’m");
  const first = h("span.intro__first", "Brendan");
  const last = h("span.intro__last", "Gray");
  const name = h("p.intro__name", { "aria-label": "Brendan Gray" }, first, last);
  const skip = h("button.intro__skip", { type: "button" }, "Skip");
  const overlay = h("div.intro", { role: "presentation" }, h("div.intro__inner", hey, name), skip);

  first.style.transform = "translateX(-120vw)";
  last.style.transform = "translateX(120vw)";
  document.body.append(overlay);
  document.body.classList.add("is-locked");

  const running = new Set();
  let skipped = false;
  let resolveSkip;
  const skipP = new Promise((r) => { resolveSkip = r; });

  const run = (el, frames, opts) => {
    const a = el.animate(frames, { fill: "both", ...opts });
    running.add(a);
    return a.finished.catch(() => {}).then(() => {
      if (running.has(a)) { try { a.commitStyles(); } catch (_) {} a.cancel(); running.delete(a); }
    });
  };
  const freeze = () => {
    for (const a of running) { try { a.commitStyles(); } catch (_) {} a.cancel(); }
    running.clear();
  };
  const doSkip = () => { if (skipped) return; skipped = true; freeze(); resolveSkip(); };
  const onKey = (e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") doSkip(); };
  overlay.addEventListener("click", doSkip);
  window.addEventListener("keydown", onKey);
  const race = (p) => Promise.race([p, skipP]);

  return (async () => {
    // 1. "Hey, I'm" fades in on a blank page.
    await race(run(hey, [{ opacity: 0, transform: "translateY(0.5em)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 720, delay: 380, easing: EXPO_OUT }));
    // 2. Brendan from the left, Gray from the right, sliding into the middle.
    if (!skipped) await race(Promise.all([
      run(first, [{ transform: "translateX(-120vw)" }, { transform: "translateX(0)" }], { duration: 1150, easing: EXPO_OUT }),
      run(last, [{ transform: "translateX(120vw)" }, { transform: "translateX(0)" }], { duration: 1150, easing: EXPO_OUT }),
    ]));
    // 3. Hold for three seconds.
    if (!skipped) { skip.classList.add("is-visible"); await race(sleep(3000)); }
    // 4. Exit: names slide off left and right, "Hey, I'm" slides up.
    skip.classList.remove("is-visible");
    await Promise.all([
      run(first, [{ transform: "translateX(-120vw)" }], { duration: 640, easing: EASE_IN }),
      run(last, [{ transform: "translateX(120vw)" }], { duration: 640, easing: EASE_IN }),
      run(hey, [{ transform: "translateY(-70vh)" }], { duration: 640, easing: EASE_IN }),
    ]);
    window.removeEventListener("keydown", onKey);
    overlay.remove();
    document.body.classList.remove("is-locked");
    markIntroSeen();
  })();
}
