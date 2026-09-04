/* ============================================================
   pages/about.js — About Me
   ============================================================ */
import { h, RM, reveal, conceal, icon } from "../util.js";
import { ABOUT, SITE } from "../data.js";

export function createAbout() {
  const photo = h("figure.about__photo.reveal", h("img", { src: ABOUT.photo, alt: ABOUT.photoAlt, decoding: "async", width: 1000, height: 1500 }));
  const title = h("h1.about__title.reveal", { tabindex: -1 }, ABOUT.heading);
  const paras = ABOUT.paragraphs.map((p) => h("p.reveal", p));
  const contact = h("div.about__contact.reveal",
    h("div",
      h("h2", "Contact me"),
      h("a", { href: SITE.linkedin, target: "_blank", rel: "noopener noreferrer" }, SITE.linkedin.replace(/\/$/, ""), h("span.sr-only", " (opens in a new tab)")),
      h("a", { href: `mailto:${SITE.email}` }, SITE.email)),
    h("a.btn", { href: SITE.resume, download: "Brendan-Gray-Resume.pdf" }, icon("download"), h("span.btn__label", "Download My Resume")),
  );
  const el = h("section.about.page", { dataset: { kind: "about" } },
    photo,
    h("div.about__text", title, h("div.about__body", paras), contact));
  const items = [title, ...paras, contact];

  return {
    kind: "about", tab: "about", title: "About Me — Brendan Gray",
    el, focusEl: title,
    mount() { return Promise.resolve(); },
    async enter({ mode = "stagger" } = {}) {
      el.classList.remove("is-staging");
      if (mode === "instant" || RM) { [photo, ...items].forEach((i) => i.classList.remove("reveal")); return; }
      await Promise.all([
        reveal([photo], { duration: 700, y: 10 }),
        reveal(items, { delay: 80, step: 55, duration: 540, y: 14 }),
      ]);
    },
    async leave() {
      if (RM) { el.style.opacity = "0"; return; }
      await conceal([photo, ...items], { step: 0, duration: 180 });
    },
    destroy() {},
  };
}

export function createNotFound() {
  const title = h("h1.reveal", { tabindex: -1 }, "Nothing here.");
  const el = h("section.notfound.page", { dataset: { kind: "notfound" } },
    title,
    h("p.reveal", "That page doesn’t exist. ", h("a", { href: "/", dataset: { link: "" }, style: { textDecoration: "underline" } }, "Back to projects")));
  return {
    kind: "notfound", tab: "projects", title: "Not found — Brendan Gray", el, focusEl: title,
    mount() { return Promise.resolve(); },
    async enter() { el.classList.remove("is-staging"); await reveal(el.querySelectorAll(".reveal"), { step: 60 }); },
    async leave() { await conceal(el.querySelectorAll(".reveal"), { step: 0, duration: 160 }); },
    destroy() {},
  };
}
