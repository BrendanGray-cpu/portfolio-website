/* ─────────────────────────────────────────────────────────
 * PROJECT CARDS  (Work tiles, and the folder cards on Home)
 *
 * WORK TILES ([data-pcard]):
 *   in view (half)  → the illustration plays its story once (js/illustrations.js, data-autoplay)
 *   hover / focus   → .show-ui: the video crossfades in over the illustration and plays
 *                     (it loads on first use, preload="none")
 *   leave / blur    → back to the illustration; the video pauses
 *   touch screens   → no hover, so when the story ends, wait 600ms, then show the video
 *                     and play it while the card is half on screen
 *   reduced motion  → the crossfade only; the video stays on its poster
 * (The dot transition was tried here and removed 2026-11-15 as too much; it lives on in
 *  js/dot-transition.js and labs/dot-transition.html.)
 *
 * FOLDER CARDS (Home, [data-folder]): hover is pure CSS. On touch there's no hover, so the
 * screenshots fan out (.open) once the folder is mostly on screen, after --folder-touch-delay.
 * ───────────────────────────────────────────────────────── */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(hover: none)').matches;

const cssNum = (name, d) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || d;
const touchDelay = () => 600;

export function mountFolders(root = document) {
  if (!TOUCH) return;
  root.querySelectorAll('[data-folder]').forEach((card) => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      setTimeout(() => card.classList.add('open'), cssNum('--folder-touch-delay', 500));
    }, { threshold: 0.7 });
    io.observe(card);
  });
}

export function mountProjectCards(root = document) {
  root.querySelectorAll('[data-pcard]').forEach((card) => {
    const video = card.querySelector('.sheet video');
    let onScreen = false;

    const load = () => { if (video && !video.src) { video.src = video.dataset.src; video.load(); } };
    const play = () => { if (!video || REDUCED) return; load(); video.play().catch(() => {}); };
    const show = () => { card.classList.add('show-ui'); play(); };
    const hide = () => { card.classList.remove('show-ui'); video?.pause(); };

    if (TOUCH) {
      card.addEventListener('illustration:end', () => setTimeout(() => { card.classList.add('show-ui'); if (onScreen) play(); }, touchDelay()), { once: true });
      new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        if (!card.classList.contains('show-ui')) return;
        onScreen ? play() : video?.pause();
      }, { threshold: 0.5 }).observe(card);
      return;
    }

    card.addEventListener('pointerenter', show);
    card.addEventListener('pointerleave', () => { if (!card.contains(document.activeElement)) hide(); });
    card.addEventListener('focusin', () => { if (card.matches(':focus-visible')) show(); });
    card.addEventListener('focusout', () => { if (!card.matches(':hover')) hide(); });
  });
}
