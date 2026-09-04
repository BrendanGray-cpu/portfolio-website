/* ============================================================
   pages/stage.js — Projects (pentagon) and Fun Zone (diamond)
   Glass bubbles with leashed gravity, spring hover, labels.
   ============================================================ */
import { h, RM, MOBILE, COARSE, clamp, animate, preload, raf, sleep } from "../util.js";
import { SECTIONS } from "../data.js";
import { LeashedField } from "../gravity.js";
import { glass, bufferSize } from "../glass.js";

const spring = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "ease-out";

export function createStage(sectionKey) {
  const section = SECTIONS[sectionKey];
  const layoutKind = sectionKey === "projects" ? "pentagon" : "diamond";
  const el = h("section.stage.page", { dataset: { layout: layoutKind, kind: "stage" }, "aria-label": section.label });
  const heading = h("h1.sr-only", { tabindex: -1 }, section.label);
  el.append(heading);

  const bubbles = section.items.map((item, i) => {
    const glassEl = h("div.bubble__glass");
    const bubble = h("a.bubble", {
      href: `${section.base}/${item.slug}`,
      dataset: { link: "", slug: item.slug, index: i },
      "aria-label": item.name,
    },
      h("div.bubble__pop",
        h("div.bubble__scale", glassEl),
        h("span.bubble__label", { "aria-hidden": "true" }, item.name)),
    );
    el.append(bubble);
    return { item, el: bubble, glassEl, img: null, canvas: null };
  });

  const field = new LeashedField(el, { leash: 40, strength: 0.16, ease: 0.11 });
  let D = 224;
  let destroyed = false;

  /* ---------- geometry ---------- */
  function positions(W, H) {
    const n = bubbles.length;
    const pent = layoutKind === "pentagon";
    D = clamp(Math.min(H * 0.30, W * 0.19), 140, 260);
    const R = pent ? Math.min(H * 0.345, W * 0.25) : Math.min(H * 0.31, W * 0.23);
    const cx = W / 2;
    const cy = pent ? H * 0.5 : H * 0.48;
    return bubbles.map((_, i) => {
      let deg;
      if (pent) deg = -90 + i * (360 / n);
      else deg = [-90, 180, 0, 90][i] ?? -90 + i * 90;      // top, left, right, bottom
      const a = (deg * Math.PI) / 180;
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
  }

  function layout() {
    if (MOBILE.matches) {
      field.stop();
      el.style.removeProperty("--d");
      for (const b of bubbles) { b.el.style.left = ""; b.el.style.top = ""; b.el.style.transform = ""; }
      return;
    }
    const W = el.clientWidth, H = el.clientHeight;
    const pts = positions(W, H);
    el.style.setProperty("--d", D + "px");
    bubbles.forEach((b, i) => {
      if (!b.field) b.field = field.add(b.el, { homeX: pts[i].x, homeY: pts[i].y, strength: 0.14 + (i % 3) * 0.02 });
      else field.setHome(b.field, pts[i].x, pts[i].y);
    });
  }

  /* ---------- glass rendering ---------- */
  const g = glass();
  async function renderGlass() {
    await Promise.all(bubbles.map(async (b) => {
      if (!b.img) b.img = await preload(b.item.image, 2500);
      if (destroyed) return;
      if (!g) {
        if (!b.glassEl.querySelector("img")) {
          b.glassEl.classList.add("is-css");
          b.glassEl.append(h("img", { src: b.item.thumb, alt: "", style: { objectPosition: `${b.item.focus[0] * 100}% ${b.item.focus[1] * 100}%` } }));
        }
        return;
      }
      if (!b.canvas) { b.canvas = h("canvas", { "aria-hidden": "true" }); b.glassEl.append(b.canvas); }
      const px = MOBILE.matches ? b.glassEl.clientWidth || 180 : D;
      const size = bufferSize(px * 1.12);
      if (b.canvas.width !== size) { b.canvas.width = size; b.canvas.height = size; }
      g.draw(b.canvas, b.img, { strength: 1, shape: 0, focus: b.item.focus, aspect: 1 });
    }));
  }

  let resizeT;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(() => { layout(); renderGlass(); if (!MOBILE.matches && !COARSE && entered) field.start(); }, 80); };
  let entered = false;

  const page = {
    kind: "stage",
    section: sectionKey,
    tab: sectionKey,
    title: sectionKey === "projects" ? "Brendan Gray — Product Designer" : "Fun Zone — Brendan Gray",
    el, focusEl: heading, bubbles,
    bubbleFor: (slug) => bubbles.find((b) => b.item.slug === slug) || null,
    imageFor: (slug) => bubbles.find((b) => b.item.slug === slug)?.img || null,
    field,

    /** Append to DOM first, then call: lays out and renders. */
    mount() {
      layout();
      window.addEventListener("resize", onResize);
      page.ready = renderGlass();
      return page.ready;
    },

    /** mode: 'pop' | 'slow' | 'instant' | 'afterMorph' */
    async enter({ mode = "pop", skipSlug = null } = {}) {
      entered = true;
      el.classList.remove("is-staging");
      const pops = bubbles.map((b) => b.el.querySelector(".bubble__pop"));
      if (mode === "instant" || RM) {
        bubbles.forEach((b) => { b.el.style.opacity = ""; });
      } else {
        const slow = mode === "slow";
        const easing = spring(slow ? "--spring-soft" : "--spring-bouncy");
        const order = bubbles.map((b, i) => i).filter((i) => bubbles[i].item.slug !== skipSlug);
        if (skipSlug) { const k = page.bubbleFor(skipSlug); if (k) k.el.style.opacity = ""; }
        await Promise.all(order.map((i, n) => {
          const b = bubbles[i];
          b.el.style.opacity = "";
          return animate(pops[i],
            [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
            { duration: slow ? 900 : 580, delay: (slow ? 140 : 30) + n * (slow ? 130 : 60), easing });
        }));
        pops.forEach((p) => { p.style.transform = ""; p.style.opacity = ""; });
      }
      if (!MOBILE.matches && !COARSE) field.start();
    },

    /** mode: 'fade' | 'morph' (keeps one bubble visible) */
    async leave({ mode = "fade", keepSlug = null } = {}) {
      field.stop();
      const others = bubbles.filter((b) => b.item.slug !== keepSlug);
      const scales = others.map((b) => b.el.querySelector(".bubble__pop"));
      if (RM) { others.forEach((b) => { b.el.style.opacity = "0"; }); return; }
      await Promise.all(scales.map((p, i) => animate(p,
        [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.6)", opacity: 0 }],
        { duration: mode === "morph" ? 260 : 200, delay: i * 20, easing: "cubic-bezier(0.5, 0, 0.9, 0.4)" })));
    },

    destroy() {
      destroyed = true;
      field.stop();
      window.removeEventListener("resize", onResize);
    },
  };
  return page;
}
