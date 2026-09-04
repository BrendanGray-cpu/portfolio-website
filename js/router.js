/* ============================================================
   router.js — history routing, page factories, transitions
   ============================================================ */
import { SECTIONS } from "./data.js";
import { createStage } from "./pages/stage.js";
import { createDetail } from "./pages/detail.js";
import { createAbout, createNotFound } from "./pages/about.js";
import { transition } from "./transitions.js";

function normalize(path) {
  let p = path.replace(/\/+$/, "") || "/";
  try { p = decodeURIComponent(p); } catch (_) {}
  return p;
}

export function match(path) {
  const p = normalize(path);
  if (p === "/" || p === "/projects") return { kind: "stage", section: "projects" };
  if (p === "/fun-zone") return { kind: "stage", section: "fun" };
  if (p === "/about") return { kind: "about" };
  let m = p.match(/^\/projects\/([\w-]+)$/);
  if (m) return SECTIONS.projects.items.some((i) => i.slug === m[1]) ? { kind: "detail", section: "projects", slug: m[1] } : { kind: "notfound" };
  m = p.match(/^\/fun-zone\/([\w-]+)$/);
  if (m) return SECTIONS.fun.items.some((i) => i.slug === m[1]) ? { kind: "detail", section: "fun", slug: m[1] } : { kind: "notfound" };
  return { kind: "notfound" };
}

function create(r) {
  switch (r.kind) {
    case "stage": return createStage(r.section);
    case "detail": return createDetail(r.section, r.slug) || createNotFound();
    case "about": return createAbout();
    default: return createNotFound();
  }
}

export class Router {
  constructor({ main, layer, nav }) {
    this.main = main; this.layer = layer; this.nav = nav;
    this.current = null;
    this.queue = Promise.resolve();
    this.path = null;

    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-link]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      e.preventDefault();
      if (normalize(url.pathname) === normalize(location.pathname)) return;
      this.navigate(url.pathname);
    });
    window.addEventListener("popstate", () => this.navigate(location.pathname, { push: false }));
  }

  /** Render the first page. With enter:false the page is mounted hidden (for the intro). */
  async start({ enter = true } = {}) {
    const to = create(match(location.pathname));
    this.path = normalize(location.pathname);
    this.current = to;
    this._apply(to);
    if (enter) {
      await transition({ main: this.main, layer: this.layer, from: null, to });
      this._focus(to);
    } else {
      to.el.classList.add("is-staging");
      this.main.append(to.el);
      await to.mount();
    }
    return to;
  }

  navigate(path, { push = true } = {}) {
    const target = normalize(path);
    this.queue = this.queue.then(async () => {
      if (target === this.path) return;
      if (push) history.pushState({}, "", target);
      const from = this.current;
      const to = create(match(target));
      this.path = target;
      this.current = to;
      this._apply(to);
      try {
        await transition({ main: this.main, layer: this.layer, from, to });
      } catch (err) {
        console.error(err);
        this.layer.replaceChildren();
        if (from?.el?.isConnected) { from.destroy(); from.el.remove(); }
        if (!to.el.isConnected) this.main.append(to.el);
        to.el.classList.remove("is-staging");
        to.el.querySelectorAll(".reveal").forEach((n) => n.classList.remove("reveal"));
        to.heroEl && (to.heroEl.style.visibility = "");
        await to.mount(); await to.enter({ mode: "instant" });
      }
      this._focus(to);
    });
    return this.queue;
  }

  _apply(to) {
    document.title = to.title;
    this.nav.setActive(to.tab);
    document.documentElement.dataset.page = to.kind;
  }

  _focus(to) {
    if (to.focusEl && document.activeElement !== to.focusEl) {
      try { to.focusEl.focus({ preventScroll: true }); } catch (_) {}
    }
  }
}
