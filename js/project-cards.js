/* ─────────────────────────────────────────────────────────
 * PROJECT CARDS  (Work tiles, and the folder cards on Home)
 *
 * WORK TILES ([data-pcard]), the dot transition from js/dot-transition.js:
 *   in view (half)  → the illustration plays its story once (js/illustrations.js, data-autoplay)
 *   hover / focus   → the illustration breaks into dots that re-form as the project's UI,
 *                     then the video fades in and plays (it loads on first hover)
 *   leave / blur    → the video pauses, its frame breaks into dots, they fly back, and the
 *                     illustration replays its story
 *   touch screens   → no hover, so after the story ends (once), wait 600ms and go to the UI;
 *                     the video plays only while the card is half on screen
 *   reduced motion  → no dots: a plain crossfade (.show-ui), and the video stays on its poster
 *
 * FOLDER CARDS (Home, [data-folder]): hover is pure CSS. On touch there's no hover, so the
 * screenshots fan out (.open) once the folder is mostly on screen, after --folder-touch-delay.
 * ───────────────────────────────────────────────────────── */
import { DotTransition } from './dot-transition.js';
import { rewindIllustration, playIllustration } from './illustrations.js';

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
    const stage = card.querySelector('.ill'), face = card.querySelector('.face');
    const canvas = face?.querySelector('canvas'), media = card.querySelector('.sheet video, .sheet img');
    if (!stage || !canvas || !media) return;
    const video = media.tagName === 'VIDEO' ? media : null;
    const load = () => { if (video && !video.src) { video.src = video.dataset.src; video.load(); } };

    // reduced motion: the old crossfade, no dots, no playback
    if (REDUCED) {
      card.addEventListener('pointerenter', () => card.classList.add('show-ui'));
      card.addEventListener('pointerleave', () => card.classList.remove('show-ui'));
      card.addEventListener('focusin', () => card.classList.add('show-ui'));
      card.addEventListener('focusout', () => card.classList.remove('show-ui'));
      return;
    }

    card.classList.add('dots');
    // the image the dots sample before the video has a frame: the video's poster, or the still itself
    const poster = video ? Object.assign(new Image(), { src: video.getAttribute('poster') }) : media;
    if (!video) media.loading = 'eager';
    let fx = null, onScreen = false;
    const ready = () => {
      if (!fx) fx = new DotTransition({ stage, illustration: canvas, face, media, poster,
        illustrationControl: { rewind: () => rewindIllustration(canvas), play: () => playIllustration(canvas) } });
      return fx;
    };
    const go = (dir) => {
      if (dir > 0) load();
      const run = () => ready().play(dir);
      poster.complete && poster.naturalWidth ? run() : poster.decode().then(run, run);
    };

    // each time the story finishes, sample its last frame in idle time, ready for the next hover
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
    card.addEventListener('illustration:end', () => idle(() => { const p = poster.complete && poster.naturalWidth; if (p) ready().warm(); }));

    if (TOUCH) {
      card.addEventListener('illustration:end', () => setTimeout(() => { if (onScreen) go(1); else card.dataset.pending = '1'; }, touchDelay()), { once: true });
      new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        if (onScreen && card.dataset.pending) { delete card.dataset.pending; go(1); }
        if (fx?.state === 'media' && video) onScreen ? video.play().catch(() => {}) : video.pause();
      }, { threshold: 0.5 }).observe(card);
      return;
    }

    card.addEventListener('pointerenter', () => go(1));
    card.addEventListener('pointerleave', () => { if (!card.contains(document.activeElement) || !card.matches(':focus-visible')) go(-1); });
    card.addEventListener('focusin', () => { if (card.matches(':focus-visible')) go(1); });
    card.addEventListener('focusout', () => { if (!card.matches(':hover')) go(-1); });
    addEventListener('resize', () => { if (fx) fx.dots = null; });   // re-sample at the new size next time
  });
}
