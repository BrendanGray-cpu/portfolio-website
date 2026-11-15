/* Drag a popover DialKit panel by its header. Position persists in localStorage under `key`.
 * The offset lives in an injected stylesheet rule, so it survives DialKit re-rendering the panel.
 * Double-click the header to send it back to where DialKit puts it. */
export function dialDrag(key) {
  const rule = document.createElement('style'); document.head.appendChild(rule);
  let pos = { x: 0, y: 0 };
  try { pos = { ...pos, ...JSON.parse(localStorage.getItem(key)) }; } catch {}
  const set = () => { rule.textContent = `.dialkit-panel:not([data-mode="inline"]) { translate: ${pos.x}px ${pos.y}px; }
    .dialkit-panel:not([data-mode="inline"]) .dialkit-panel-header { cursor: grab; }`; };
  set();

  let drag = null, moved = false;
  addEventListener('pointerdown', (e) => {
    const header = e.target.closest?.('.dialkit-panel .dialkit-panel-header');
    if (!header || e.button !== 0 || e.target.closest('input, select, textarea')) return;
    const panel = header.closest('.dialkit-panel');
    drag = { sx: e.clientX, sy: e.clientY, x: pos.x, y: pos.y, r: panel.getBoundingClientRect() };
    moved = false;
  }, true);
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true; document.body.style.cursor = 'grabbing'; e.preventDefault();
    // keep at least 60px of the panel on screen
    const minDx = 60 - drag.r.right, maxDx = innerWidth - 60 - drag.r.left;
    const minDy = -drag.r.top, maxDy = innerHeight - 40 - drag.r.top;
    pos = { x: drag.x + Math.max(minDx, Math.min(maxDx, dx)), y: drag.y + Math.max(minDy, Math.min(maxDy, dy)) };
    set();
  }, true);
  addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null; document.body.style.cursor = '';
    if (moved) try { localStorage.setItem(key, JSON.stringify(pos)); } catch {}
  }, true);
  // a drag shouldn't also count as a click on the header (which collapses the panel)
  addEventListener('click', (e) => { if (moved && e.target.closest?.('.dialkit-panel-header')) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  addEventListener('dblclick', (e) => {
    if (!e.target.closest?.('.dialkit-panel .dialkit-panel-header')) return;
    pos = { x: 0, y: 0 }; set(); try { localStorage.removeItem(key); } catch {}
  }, true);
}
