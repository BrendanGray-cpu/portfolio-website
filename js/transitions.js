/* ============================================================
   transitions.js — page choreography.
   - stage → detail: glass circle morphs into the hero rectangle
     while its refraction relaxes, then content staggers in.
   - detail → stage: the reverse.
   - detail → detail (prev/next): slide out, then image first,
     text in descending order.
   - everything else: quick fade out, staggered reveal in.
   ============================================================ */
import { h, RM, MOBILE, animate, preload, clamp, raf } from "./util.js";
import { glass, directGlass } from "./glass.js";

const MORPH_EASE = "cubic-bezier(0.7, 0, 0.2, 1)";
const MORPH_MS = 580;
const RADIUS = 16;

const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

function swap(main, from, to) {
  if (from) { from.destroy(); from.el.remove(); }
  main.append(to.el);
}

function heroOnScreen(page) {
  const r = page.heroEl.getBoundingClientRect();
  return r.bottom > 40 && r.top < window.innerHeight - 40 && r.width > 0;
}

/**
 * Build a morph element that starts at `rect` showing `item`'s image.
 * `glassImg` is the decoded thumb used for the lens texture.
 */
function makeMorph(layer, rect, item, glassImg, radius) {
  const m = h("div.morph", { style: {
    left: rect.left + "px", top: rect.top + "px", width: rect.width + "px", height: rect.height + "px", borderRadius: radius,
  } });
  m.append(h("img", { src: item.image, alt: "", style: { objectPosition: `${item.focus[0] * 100}% ${item.focus[1] * 100}%` } }));
  let canvas = null, g = null;
  if (glass() && glassImg) {
    canvas = h("canvas", { width: 1024, height: 1024 });
    g = directGlass(canvas);
    if (g) m.append(canvas); else canvas = null;
  }
  layer.append(m);
  return { m, canvas, g };
}

function runMorph({ m, canvas, g }, rectA, rectB, item, glassImg, direction) {
  // direction: 1 = circle → rect (strength 1→0), -1 = rect → circle
  const toCircle = direction < 0;
  const anim = m.animate(
    [{ left: rectA.left + "px", top: rectA.top + "px", width: rectA.width + "px", height: rectA.height + "px", borderRadius: toCircle ? RADIUS + "px" : "50%" },
     { left: rectB.left + "px", top: rectB.top + "px", width: rectB.width + "px", height: rectB.height + "px", borderRadius: toCircle ? "50%" : RADIUS + "px" }],
    { duration: MORPH_MS, easing: MORPH_EASE, fill: "both" });
  const t0 = performance.now();
  if (canvas) {
    const loop = () => {
      const t = clamp((performance.now() - t0) / MORPH_MS, 0, 1);
      const r = m.getBoundingClientRect();
      const w = r.width || 1, hh = r.height || 1;
      // progress of the size change, derived from the live rect
      const p = clamp((w - rectA.width) / ((rectB.width - rectA.width) || 1), 0, 1);
      const flat = toCircle ? 1 - p : p;           // 0 = glass circle, 1 = flat rect
      g.render(glassImg, {
        strength: 1 - flat, shape: flat, aspect: w / hh, radius: RADIUS / (hh / 2), focus: item.focus,
      });
      canvas.style.opacity = String(toCircle ? smooth(0.05, 0.45, 1 - flat) : 1 - smooth(0.55, 0.95, flat));
      if (t < 1) requestAnimationFrame(loop);
    };
    loop();
  }
  return anim.finished.catch(() => {});
}

async function morphIn(main, layer, from, to) {
  const b = from.bubbleFor(to.slug);
  const item = to.item;
  const rectA = b.glassEl.getBoundingClientRect();
  const thumb = b.img || (await preload(item.image, 400));
  const full = preload(item.image, 350);
  from.field.stop();
  const fading = from.leave({ mode: "morph", keepSlug: to.slug });
  await full;

  const morph = makeMorph(layer, rectA, item, thumb, "50%");
  if (morph.g) morph.g.render(thumb, { strength: 1, shape: 0, aspect: 1, focus: item.focus });
  b.glassEl.style.visibility = "hidden";
  from.hideTitle?.();

  // Let the other bubbles fade, then remove the stage BEFORE the detail page
  // is measured, otherwise the hero slot sits one viewport too low.
  await Promise.race([fading, new Promise((r) => setTimeout(r, 200))]);
  from.destroy(); from.el.remove();

  to.el.classList.add("is-staging");
  to.heroEl.style.visibility = "hidden";
  main.append(to.el);
  await to.mount();
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  await raf();
  const rectB = to.heroEl.getBoundingClientRect();

  await runMorph(morph, rectA, rectB, item, thumb, 1);
  to.heroEl.style.visibility = "";
  morph.m.remove();
  morph.g?.destroy();
  await to.enter({ mode: "afterMorph" });
}

async function morphOut(main, layer, from, to) {
  const item = from.item;
  const rectA = from.heroEl.getBoundingClientRect();
  const thumb = await preload(item.image, 400);
  await from.leave({ mode: "morph" });

  const morph = makeMorph(layer, rectA, item, thumb, RADIUS + "px");
  if (morph.canvas) morph.canvas.style.opacity = "0";
  from.heroEl.style.visibility = "hidden";
  from.destroy(); from.el.remove();

  to.el.classList.add("is-staging");
  main.append(to.el);
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  const ready = to.mount();          // layout is synchronous; glass renders in the background
  await raf();
  const b = to.bubbleFor(from.slug);
  const rectB = b.glassEl.getBoundingClientRect();

  await Promise.all([runMorph(morph, rectA, rectB, item, thumb, -1), ready]);
  b.el.style.opacity = "1";
  morph.m.remove();
  morph.g?.destroy();
  await to.enter({ mode: "afterMorph", skipSlug: from.slug });
}

export async function transition({ main, layer, from, to }) {
  if (!from) {
    to.el.classList.add("is-staging");
    main.append(to.el);
    await to.mount();
    await to.enter({ mode: "stagger" });
    return;
  }
  if (RM) {
    await from.leave({ mode: "instant" });
    swap(main, from, to);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    await to.mount();
    await to.enter({ mode: "instant" });
    return;
  }
  const canMorph = !MOBILE.matches && glassReady();
  if (canMorph && from.kind === "stage" && to.kind === "detail" && from.section === to.section && from.bubbleFor(to.slug)) {
    return morphIn(main, layer, from, to);
  }
  if (canMorph && from.kind === "detail" && to.kind === "stage" && from.section === to.section && heroOnScreen(from)) {
    return morphOut(main, layer, from, to);
  }
  if (from.kind === "detail" && to.kind === "detail" && from.section === to.section) {
    const dir = to.slug === from.next.slug ? 1 : to.slug === from.prev.slug ? -1 : (to.index > from.index ? 1 : -1);
    await from.leave({ mode: "slide", dir });
    to.el.classList.add("is-staging");
    swap(main, from, to);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    await to.mount();
    await to.enter({ mode: "stagger", dir });
    return;
  }
  await from.leave({ mode: "fade" });
  to.el.classList.add("is-staging");
  swap(main, from, to);
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  await to.mount();
  await to.enter({ mode: "stagger" });
}

function glassReady() { return true; }
