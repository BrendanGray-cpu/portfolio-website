/* ============================================================
   pages/stage.js — Projects (two-over-three) and Fun Zone (2×2)
   Cards with a thumbnail and title; spring hover; keyboard-ready.
   ============================================================ */
import { h, RM, animate } from "../util.js";
import { SECTIONS } from "../data.js";

const spring = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "ease-out";

export function createStage(sectionKey) {
  const section = SECTIONS[sectionKey];
  const rows = sectionKey === "projects" ? [2, 3] : [2, 2];
  const el = h("section.stage.page", { dataset: { kind: "stage", section: sectionKey }, "aria-label": section.label });
  const heading = h("h1.sr-only", { tabindex: -1 }, section.label);
  const grid = h("div.cards", { dataset: { rows: rows.join("-") } });
  el.append(heading, grid);

  const cards = [];
  let i = 0;
  for (const count of rows) {
    const row = h("div.cards__row");
    for (let n = 0; n < count && i < section.items.length; n++, i++) {
      const item = section.items[i];
      const thumbEl = h("img", {
        src: item.thumb, alt: "", decoding: "async",
        srcset: `${item.thumb} 900w, ${item.image} 1800w`,
        sizes: "(max-width: 720px) 50vw, 240px",
        style: { objectPosition: `${item.focus[0] * 100}% ${item.focus[1] * 100}%` },
      });
      const card = h("a.card", { href: `${section.base}/${item.slug}`, dataset: { link: "", slug: item.slug } },
        h("span.card__thumb", thumbEl),
        h("span.card__title", item.name));
      row.append(card);
      cards.push({ item, el: card, thumbEl });
    }
    grid.append(row);
  }

  const page = {
    kind: "stage", section: sectionKey, tab: sectionKey,
    title: sectionKey === "projects" ? "Brendan Gray — Product Designer" : "Fun Zone — Brendan Gray",
    el, focusEl: heading, cards,
    cardFor: (slug) => cards.find((c) => c.item.slug === slug) || null,
    mount() { return Promise.resolve(); },

    /** mode: 'pop' | 'slow' | 'instant' | 'afterMorph' (skipSlug already visible) */
    async enter({ mode = "pop", skipSlug = null } = {}) {
      el.classList.remove("is-staging");
      if (mode === "instant" || RM) { cards.forEach((c) => { c.el.style.opacity = ""; }); return; }
      const slow = mode === "slow";
      const easing = spring(slow ? "--spring-soft" : "--spring-bouncy");
      const order = cards.filter((c) => c.item.slug !== skipSlug);
      const kept = skipSlug && page.cardFor(skipSlug);
      if (kept) kept.el.style.opacity = "";
      await Promise.all(order.map((c, n) => {
        c.el.style.opacity = "";
        return animate(c.el,
          [{ transform: "scale(0.9) translateY(12px)", opacity: 0 }, { transform: "scale(1) translateY(0)", opacity: 1 }],
          { duration: slow ? 900 : 560, delay: (slow ? 140 : 30) + n * (slow ? 120 : 60), easing });
      }));
      cards.forEach((c) => { c.el.style.transform = ""; c.el.style.opacity = ""; });
    },

    /** mode: 'fade' | 'morph' (keeps one card's thumbnail for the morph) */
    async leave({ mode = "fade", keepSlug = null } = {}) {
      const others = cards.filter((c) => c.item.slug !== keepSlug);
      const kept = keepSlug && page.cardFor(keepSlug);
      if (RM) { others.forEach((c) => { c.el.style.opacity = "0"; }); return; }
      const ps = others.map((c, n) => animate(c.el,
        [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.94)", opacity: 0 }],
        { duration: mode === "morph" ? 240 : 200, delay: n * 20, easing: "cubic-bezier(0.5, 0, 0.9, 0.4)" }));
      // the kept card's frame fades too; its thumbnail is carried by the morph element
      if (kept) ps.push(animate(kept.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: 80, easing: "cubic-bezier(0.5, 0, 0.9, 0.4)" }));
      await Promise.all(ps);
    },
    destroy() {},
  };
  return page;
}
