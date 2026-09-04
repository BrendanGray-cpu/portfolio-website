/* ============================================================
   gravity.js — "leashed gravity" field, adapted from the
   Wellspring Group prototype (js/gravity.js).
   Elements drift toward the pointer but are tethered to a home
   position. Home positions can be updated on resize.
   ============================================================ */
import { RM } from "./util.js";

export class LeashedField {
  constructor(container, opts = {}) {
    this.container = container;
    this.ease = opts.ease ?? 0.12;
    this.defaultLeash = opts.leash ?? 44;
    this.defaultStrength = opts.strength ?? 0.18;
    this.influence = opts.influence; // px, or undefined → viewport/3
    this.items = [];
    this.client = { x: -99999, y: -99999, active: false };
    this.running = false;
    this._raf = null;
    this._onMove = (e) => {
      const pt = e.touches ? e.touches[0] : e;
      this.client.x = pt.clientX; this.client.y = pt.clientY; this.client.active = true;
    };
    this._onOut = (e) => { if (!e.relatedTarget) this.client.active = false; };
  }

  add(el, cfg = {}) {
    const item = {
      el, homeX: cfg.homeX || 0, homeY: cfg.homeY || 0,
      strength: cfg.strength ?? this.defaultStrength,
      leash: cfg.leash ?? this.defaultLeash,
      base: cfg.base || "translate(-50%,-50%)",
      curX: 0, curY: 0,
    };
    this.setHome(item, item.homeX, item.homeY);
    this.items.push(item);
    return item;
  }

  setHome(item, x, y) {
    item.homeX = x; item.homeY = y;
    item.el.style.left = x + "px";
    item.el.style.top = y + "px";
  }

  start() {
    if (this.running || RM) return;
    this.running = true;
    window.addEventListener("mousemove", this._onMove, { passive: true });
    window.addEventListener("mouseout", this._onOut);
    this._loop();
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener("mousemove", this._onMove);
    window.removeEventListener("mouseout", this._onOut);
  }

  /** Ease every item back to home, then stop. */
  release() {
    this.client.active = false;
    for (const it of this.items) { it.el.style.transform = it.base; }
    this.stop();
  }

  _loop() {
    const p = this.client;
    let px = 0, py = 0;
    if (p.active) {
      const cr = this.container.getBoundingClientRect();
      px = p.x - cr.left; py = p.y - cr.top;
    }
    const influence = this.influence ?? window.innerWidth / 3;
    for (const it of this.items) {
      let tx = 0, ty = 0;
      if (p.active) {
        const dx = px - it.homeX, dy = py - it.homeY;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < influence) {
          let mag = Math.min(dist * it.strength, it.leash);
          mag *= Math.min(1, (influence - dist) / (influence * 0.5));
          tx = (dx / dist) * mag; ty = (dy / dist) * mag;
        }
      }
      it.curX += (tx - it.curX) * this.ease;
      it.curY += (ty - it.curY) * this.ease;
      if (Math.abs(it.curX) < 0.05 && tx === 0) it.curX = 0;
      if (Math.abs(it.curY) < 0.05 && ty === 0) it.curY = 0;
      it.el.style.transform = `${it.base} translate(${it.curX.toFixed(2)}px, ${it.curY.toFixed(2)}px)`;
    }
    this._raf = requestAnimationFrame(() => this.running && this._loop());
  }
}
