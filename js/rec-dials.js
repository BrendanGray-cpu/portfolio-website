/* ─────────────────────────────────────────────────────────
 * RECOMMENDATION SPACING DIALS  (home page, only with ?dials)
 *
 *   quote ─┬─ quoteToName
 *   name  ─┼─ nameToTitle
 *   title ─┼─ titleToButton         (open: titleToText, then textToButton)
 *   button
 *   between recs in a column ── betweenRecs, columns ── betweenColumns
 *
 * Tweaks persist in localStorage; DialKit's "Copy parameters" puts them on the clipboard.
 * ───────────────────────────────────────────────────────── */
if (new URLSearchParams(location.search).has('dials')) {
  const KEY = 'rec-dials.v1';
  const CONFIG = {
    quoteToName: [24, 0, 72, 1],
    nameToTitle: [2, 0, 24, 1],
    titleToButton: [14, 0, 72, 1],
    titleToText: [24, 0, 72, 1],
    betweenRecs: [96, 24, 200, 4],
    betweenColumns: [96, 24, 200, 4],
    openFirst: { type: 'action', label: 'Open / close the first one' },
  };
  const VARS = { quoteToName: '--rec-quote-name', nameToTitle: '--rec-name-title', titleToButton: '--rec-title-button', titleToText: '--rec-title-text', betweenRecs: '--rec-between', betweenColumns: '--rec-columns' };
  const defaults = Object.fromEntries(Object.entries(CONFIG).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v[0]]));
  let V = { ...defaults, ...(() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })() };
  const recs = document.querySelector('.recs');
  const apply = () => { for (const k in VARS) recs.style.setProperty(VARS[k], V[k] + 'px'); };

  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/vendor/dialkit/styles.css'; document.head.appendChild(css);
  const s = document.createElement('script'); s.src = '/vendor/dialkit/browser.global.js';
  s.onload = () => {
    DialKit.createDialRoot({ theme: 'light' });
    const dials = DialKit.createDialKit('Recommendation spacing', CONFIG, {
      onAction: (a) => {
        if (a === 'openFirst') document.querySelector('.rec .toggle')?.click();
      },
    });
    dials.setValues(V);
    dials.subscribe((v) => { V = { ...V, ...Object.fromEntries(Object.keys(defaults).filter(k => k in v).map(k => [k, v[k]])) }; try { localStorage.setItem(KEY, JSON.stringify(V)); } catch {} apply(); }, false);
    apply();
    recs.scrollIntoView({ block: 'start' });
  };
  document.head.appendChild(s);
}
