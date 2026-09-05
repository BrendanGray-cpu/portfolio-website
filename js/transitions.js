/* ============================================================
   transitions.js — page choreography.
   - stage → detail: the card's thumbnail morphs into the hero,
     then content staggers in.
   - detail → stage: the reverse.
   - detail → detail (prev/next): slide out, then image first,
     text in descending order.
   - everything else: quick fade out, staggered reveal in.
   ============================================================ */
import { h, RM, MOBILE, animate, preload, raf } from "./util.js";

const MORPH_EASE = "cubic-bezier(0.7, 0, 0.2, 1)";
const MORPH_MS = 560;
const HERO_RADIUS = 16;
const THUMB_RADIUS = 8;

function swap(main, from, to) {
  if (from) { from.destroy(); from.el.remove(); }
  main.append(to.el);
}

function heroOnScreen(page) {
  const r = page.heroEl.getBoundingClientRect();
  return r.bottom > 40 && r.top < window.innerHeight - 40 && r.width > 0;
}

/** A fixed image element that starts at `rect` showing `item`'s image. */
function makeMorph(layer, rect, item, radius) {
  const m = h("div.morph", { style: {
    left: rect.left + "px", top: rect.top + "px", width: rect.width + "px", height: rect.height + "px", borderRadius: radius + "px",
  } });
  m.append(h("img", { src: item.image, alt: "", style: { objectPosition: `${item.focus[0] * 100}% ${item.focus[1] * 100}%` } }));
  layer.append(m);
  return m;
}

function runMorph(m, rectA, rectB, radiusA, radiusB) {
  return animate(m,
    [{ left: rectA.left + "px", top: rectA.top + "px", width: rectA.width + "px", height: rectA.height + "px", borderRadius: radiusA + "px" },
     { left: rectB.left + "px", top: rectB.top + "px", width: rectB.width + "px", height: rectB.height + "px", borderRadius: radiusB + "px" }],
    { duration: MORPH_MS, easing: MORPH_EASE });
}

async function morphIn(main, layer, from, to) {
  const c = from.cardFor(to.slug);
  const item = to.item;
  const rectA = c.thumbEl.getBoundingClientRect();
  await preload(item.image, 350);

  const m = makeMorph(layer, rectA, item, THUMB_RADIUS);
  c.thumbEl.style.visibility = "hidden";
  const fading = from.leave({ mode: "morph", keepSlug: to.slug });

  // Let the other cards fade, then remove the stage BEFORE the detail page
  // is measured, otherwise the hero slot sits one viewport too low.
  await Promise.race([fading, new Promise((r) => setTimeout(r, 220))]);
  from.destroy(); from.el.remove();

  to.el.classList.add("is-staging");
  to.heroEl.style.visibility = "hidden";
  main.append(to.el);
  await to.mount();
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  await raf();
  const rectB = to.heroEl.getBoundingClientRect();

  await runMorph(m, rectA, rectB, THUMB_RADIUS, HERO_RADIUS);
  to.heroEl.style.visibility = "";
  m.remove();
  await to.enter({ mode: "afterMorph" });
}

async function morphOut(main, layer, from, to) {
  const item = from.item;
  const rectA = from.heroEl.getBoundingClientRect();
  await from.leave({ mode: "morph" });

  const m = makeMorph(layer, rectA, item, HERO_RADIUS);
  from.heroEl.style.visibility = "hidden";
  from.destroy(); from.el.remove();

  to.el.classList.add("is-staging");
  main.append(to.el);
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  await to.mount();
  await raf();
  const c = to.cardFor(from.slug);
  const rectB = c.thumbEl.getBoundingClientRect();
  c.thumbEl.style.visibility = "hidden";
  c.el.style.opacity = "";          // the card frame appears as the image lands

  const frame = animate(c.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: MORPH_MS - 200 });
  await Promise.all([runMorph(m, rectA, rectB, HERO_RADIUS, THUMB_RADIUS), frame]);
  c.thumbEl.style.visibility = "";
  m.remove();
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
  const canMorph = !MOBILE.matches;
  if (canMorph && from.kind === "stage" && to.kind === "detail" && from.section === to.section && from.cardFor(to.slug)) {
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
