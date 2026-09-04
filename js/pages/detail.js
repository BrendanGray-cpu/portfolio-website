/* ============================================================
   pages/detail.js — project / fun-zone detail page
   ============================================================ */
import { h, RM, animate, reveal, conceal, icon } from "../util.js";
import { findItem } from "../data.js";

function renderItems(items) {
  const out = [];
  for (const it of items) {
    if (typeof it === "string") out.push(h("p", it));
    else if (it.sub) out.push(h("h3", it.sub), h("p", it.text));
    else if (it.list) out.push(h("ul", it.list.map((li) => h("li", li))));
    else if (it.figure) out.push(h("div.figure-pair", it.figure.map((f) =>
      h("figure", h("img", { src: f.src, alt: f.alt, width: f.width, height: f.height, loading: "lazy", decoding: "async" }), h("figcaption", f.caption)))));
  }
  return out;
}

export function createDetail(sectionKey, slug) {
  const found = findItem(sectionKey, slug);
  if (!found) return null;
  const { item, index, prev, next, section } = found;
  const isFun = sectionKey === "fun";

  const back = h("a.textlink.detail__back.reveal", { href: section.path, dataset: { link: "" } }, icon("chevLeft"), section.label);
  const title = h("h1.detail__title.reveal", { tabindex: -1 }, item.name);
  const meta = h("ul.meta.reveal", { "aria-label": "Project details" },
    h("li", item.role),
    !isFun && h("li", item.company),
    !isFun && h("li", item.duration),
  );
  const cta = item.link ? h("div.detail__cta.reveal",
    h("a.btn", { href: item.link, target: "_blank", rel: "noopener noreferrer" },
      icon("external"), h("span.btn__label", item.cta), h("span.sr-only", " (opens in a new tab)"))) : null;

  const heroImg = h("img", {
    src: item.image, alt: item.alt, decoding: "async",
    srcset: `${item.thumb} 900w, ${item.image} 1800w`,
    sizes: "(max-width: 720px) calc(100vw - 48px), 66vw",
    style: { objectPosition: `${item.focus[0] * 100}% ${item.focus[1] * 100}%` },
  });
  const hero = h("figure.detail__hero", { style: { aspectRatio: String(item.aspect) } }, heroImg);

  const sections = item.sections.map((s) => h("section.detail__section.reveal", h("h2", s.heading), renderItems(s.items)));

  const pager = h("nav.pager.reveal", { "aria-label": `${section.label} navigation` },
    h("a.textlink.pager__prev", { href: `${section.base}/${prev.slug}`, dataset: { link: "", dir: "-1" }, rel: "prev" }, icon("chevLeft"), prev.name),
    h("a.textlink.pager__next", { href: `${section.base}/${next.slug}`, dataset: { link: "", dir: "1" }, rel: "next" }, next.name, icon("chevRight")),
  );

  const el = h("article.detail.page", { dataset: { kind: "detail", section: sectionKey } },
    h("div.detail__head", h("div.detail__aside", back, title, meta, cta), hero),
    h("div.detail__body", sections),
    pager,
  );

  const items = [back, title, meta, cta, ...sections, pager].filter(Boolean);

  const page = {
    kind: "detail", section: sectionKey, tab: sectionKey, slug, index, item, prev, next,
    title: `${item.name} — Brendan Gray`,
    el, focusEl: title, heroEl: hero,
    mount() { return Promise.resolve(); },

    /** mode: 'stagger' | 'afterMorph' | 'instant'; dir: 1 next, -1 prev, 0 none */
    async enter({ mode = "stagger", dir = 0 } = {}) {
      el.classList.remove("is-staging");
      if (mode === "instant" || RM) { items.forEach((i) => i.classList.remove("reveal")); hero.style.visibility = ""; return; }
      const x = dir * 28;
      const ps = [];
      if (mode === "afterMorph") {
        hero.style.visibility = "";
        ps.push(reveal(items, { delay: 30, step: 45, duration: 500, y: 14 }));
      } else {
        hero.style.visibility = "";
        ps.push(animate(hero, [{ opacity: 0, transform: `translateX(${x || 0}px) translateY(${x ? 0 : 12}px)` }, { opacity: 1, transform: "translate(0,0)" }], { duration: 560 })
          .then(() => { hero.style.opacity = ""; hero.style.transform = ""; }));
        ps.push(reveal(items, { delay: 120, step: 45, duration: 500, y: x ? 0 : 14, x }));
      }
      await Promise.all(ps);
    },

    /** mode: 'fade' | 'slide' | 'morph' */
    async leave({ mode = "fade", dir = 0 } = {}) {
      if (RM) { el.style.opacity = "0"; return; }
      if (mode === "morph") {
        await conceal(items, { step: 0, duration: 170, y: -6 });
        return;
      }
      if (mode === "slide") {
        const x = -dir * 24;
        await Promise.all([
          conceal(items, { step: 16, duration: 220, x, y: 0 }),
          animate(hero, [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: `translateX(${x}px)` }], { duration: 240, easing: "cubic-bezier(0.5, 0, 0.9, 0.4)" }),
        ]);
        return;
      }
      await Promise.all([
        conceal(items, { step: 0, duration: 180 }),
        animate(hero, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 }),
      ]);
    },
    destroy() {},
  };
  return page;
}
