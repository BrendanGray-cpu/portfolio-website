/* ============================================================
   lightbox.js — click an image to zoom it full screen.
   The image FLIPs from its place on the page to a centred,
   viewport-fitted rectangle over a soft scrim; the X, the
   backdrop, the image itself, or Escape morphs it back.
   ============================================================ */
import { h, RM, animate, ICONS } from "./util.js";

const EASE = "cubic-bezier(0.7, 0, 0.2, 1)";
const MS = 520;
let open = null;

function fitRect(w, hgt) {
  const m = window.innerWidth < 721 ? 16 : 56;
  const vw = window.innerWidth - m * 2, vh = window.innerHeight - m * 2;
  const s = Math.min(vw / w, vh / hgt, 1.6);
  const W = w * s, H = hgt * s;
  return { left: (window.innerWidth - W) / 2, top: (window.innerHeight - H) / 2, width: W, height: H };
}

export function openLightbox(source) {
  if (open) return;
  const rectA = source.getBoundingClientRect();
  const radius = getComputedStyle(source.closest("figure, .detail__hero") || source).borderRadius || "0px";
  const natW = source.naturalWidth || rectA.width, natH = source.naturalHeight || rectA.height;

  const img = h("img.lightbox__img", { src: source.dataset.full || source.currentSrc || source.src, alt: source.alt, draggable: false });
  const close = h("button.lightbox__close", { type: "button", "aria-label": "Close", html: ICONS.close });
  const backdrop = h("div.lightbox__backdrop");
  const root = h("div.lightbox", { role: "dialog", "aria-modal": "true", "aria-label": source.alt || "Image" }, backdrop, img, close);
  document.body.append(root);
  document.body.classList.add("is-locked");
  source.style.visibility = "hidden";

  const place = (r) => Object.assign(img.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  let rectB = fitRect(natW, natH);
  place(rectA);
  img.style.borderRadius = radius;

  const onResize = () => { rectB = fitRect(natW, natH); place(rectB); };
  const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); closeLightbox(); } };
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKey);
  backdrop.addEventListener("click", closeLightbox);
  img.addEventListener("click", closeLightbox);
  close.addEventListener("click", closeLightbox);

  open = { root, img, source, rectA, radius, onResize, onKey, closing: false };

  const enter = Promise.all([
    animate(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: RM ? 1 : 320 }),
    animate(close, [{ opacity: 0, transform: "scale(0.8)" }, { opacity: 1, transform: "scale(1)" }], { duration: RM ? 1 : 320, delay: RM ? 0 : 200 }),
    animate(img,
      [{ left: rectA.left + "px", top: rectA.top + "px", width: rectA.width + "px", height: rectA.height + "px", borderRadius: radius },
       { left: rectB.left + "px", top: rectB.top + "px", width: rectB.width + "px", height: rectB.height + "px", borderRadius: "12px" }],
      { duration: RM ? 1 : MS, easing: EASE }),
  ]);
  enter.then(() => { if (open && !open.closing) close.focus({ preventScroll: true }); });
  return enter;
}

export async function closeLightbox() {
  if (!open || open.closing) return;
  const o = open; o.closing = true;
  window.removeEventListener("resize", o.onResize);
  window.removeEventListener("keydown", o.onKey);
  // Re-measure the source in case the layout moved (it can't scroll while locked).
  const rectA = o.source.getBoundingClientRect();
  const r = o.img.getBoundingClientRect();
  await Promise.all([
    animate(o.root.querySelector(".lightbox__backdrop"), [{ opacity: 1 }, { opacity: 0 }], { duration: RM ? 1 : 300, delay: RM ? 0 : 120 }),
    animate(o.root.querySelector(".lightbox__close"), [{ opacity: 1 }, { opacity: 0 }], { duration: RM ? 1 : 160 }),
    animate(o.img,
      [{ left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "12px" },
       { left: rectA.left + "px", top: rectA.top + "px", width: rectA.width + "px", height: rectA.height + "px", borderRadius: o.radius }],
      { duration: RM ? 1 : MS, easing: EASE }),
  ]);
  o.source.style.visibility = "";
  o.root.remove();
  document.body.classList.remove("is-locked");
  open = null;
  try { o.source.focus({ preventScroll: true }); } catch (_) {}
}

/** Make an <img> open the lightbox on click / Enter / Space. */
export function makeZoomable(img) {
  img.classList.add("zoomable");
  img.setAttribute("tabindex", "0");
  img.setAttribute("role", "button");
  img.setAttribute("aria-label", `${img.alt || "Image"}. View larger.`);
  const go = (e) => { e.preventDefault(); openLightbox(img); };
  img.addEventListener("click", go);
  img.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") go(e); });
  return img;
}
