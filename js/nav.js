/* ============================================================
   nav.js — wordmark + tabs with a sliding underline
   ============================================================ */
import { RM, reveal } from "./util.js";

export function initNav(navEl) {
  const tabs = [...navEl.querySelectorAll(".tab")];
  const ink = navEl.querySelector(".tabs__ink");
  const wordmark = navEl.querySelector(".wordmark");
  let current = null;
  let hidden = false;

  function positionInk(instant = false) {
    const t = navEl.querySelector(".tab.is-active");
    if (!t || hidden) { ink.style.width = "0"; ink.classList.remove("is-ready"); return; }
    if (instant) ink.style.transition = "none";
    ink.style.left = t.offsetLeft + "px";
    ink.style.width = t.offsetWidth + "px";
    if (instant) { void ink.offsetWidth; ink.style.transition = ""; }
    ink.classList.add("is-ready");
  }

  function setActive(key) {
    const first = current == null;
    current = key;
    for (const t of tabs) {
      const on = t.dataset.tab === key;
      t.classList.toggle("is-active", on);
      if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    }
    positionInk(first);
  }

  async function show({ slow = false } = {}) {
    navEl.classList.remove("is-hidden");
    if (slow && !RM) {
      hidden = true;
      positionInk(true);
      await reveal([wordmark, ...tabs], { step: 120, duration: 720, y: 6 });
      hidden = false;
      positionInk(true);
    }
  }

  window.addEventListener("resize", () => positionInk(true));
  if (document.fonts?.ready) document.fonts.ready.then(() => positionInk(true));

  return { setActive, show, positionInk };
}
