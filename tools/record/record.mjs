/* Records the contract sign-up flows from the local prototype as PNG frames
 * via the CDP screencast (crisp at 2x), with a drawn cursor and eased mouse paths.
 * Usage: node record.mjs <clip> <outdir>
 *   clip = signer | payer
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [clip, out] = process.argv.slice(2);
const BASE = 'http://localhost:5181';
const [W, H] = clip === 'payer' ? [760, 860] : [1280, 800]; const Z = 1;   // render at 2x by zooming the page in a 2x viewport (screencast ignores deviceScaleFactor)
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });

const WEBGL = ['engine', 'glass', 'wellspring', 'vantage'].includes(clip);
const S = WEBGL ? 3 : 1;   // slow motion: page time runs 1/S speed, frames are retimed back
const browser = WEBGL
  ? await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] })
  : await chromium.launch({ executablePath: '/Users/parents/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();

const CURSOR_CSS = `
  [class^="scenario-panel"], [class*=" scenario-panel"] { visibility: hidden !important; opacity: 0 !important; }
  #rec-cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; z-index: 2147483647; pointer-events: none;
    transform: translate(-100px,-100px); transition: none; }
  #rec-cursor svg { width: 22px; height: 22px; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.35)); }
  #rec-cursor .ring { position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; border-radius: 50%;
    background: rgba(17,17,17,.16); transform: scale(0); opacity: 0; }
  #rec-cursor.down .ring { animation: recring .45s ease-out; }
  @keyframes recring { 0% { transform: scale(.2); opacity: 1 } 100% { transform: scale(1.4); opacity: 0 } }
  * { caret-color: auto; }
  ::-webkit-scrollbar { display: none; }
  .chat-topbar { display: none !important; }`;
if (S > 1) await page.addInitScript((S) => {
  const pn = performance.now.bind(performance), dn = Date.now, t0p = pn(), t0d = dn();
  performance.now = () => t0p + (pn() - t0p) / S;
  Date.now = () => t0d + (dn() - t0d) / S;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => cb(performance.now()));
  const st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
  window.setTimeout = (f, d, ...a) => st(f, (d || 0) * S, ...a);
  window.setInterval = (f, d, ...a) => si(f, (d || 0) * S, ...a);
}, S);
await page.addInitScript((css) => {
  addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const c = document.createElement('div'); c.id = 'rec-cursor';
    c.innerHTML = '<div class="ring"></div><svg viewBox="0 0 24 24"><path d="M5 3l14 8-6.2 1.6L10 19z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX - 5}px, ${e.clientY - 3}px)`; }, true);
    addEventListener('mousedown', () => { c.classList.remove('down'); void c.offsetWidth; c.classList.add('down'); }, true);
  });
}, CURSOR_CSS);

/* ---------- capture ----------
 * A tight Page.captureScreenshot loop (~25-30fps at true 2x). The CDP screencast
 * only emits CSS-pixel frames, and zooming the page broke vh-based layouts. */
const cdp = await ctx.newCDPSession(page);
if (S > 1) { await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / S }); }
const frames = [];
let recording = false, loop = null;
const start = async () => {
  recording = true;
  loop = (async () => {
    while (recording) {
      const t = performance.now() / 1000 / S;
      try {
        const r = await cdp.send('Page.captureScreenshot', WEBGL ? { format: 'jpeg', quality: 92, optimizeForSpeed: true } : { format: 'png', optimizeForSpeed: true });
        const file = path.join(out, `f${String(frames.length).padStart(5, '0')}.${WEBGL ? 'jpg' : 'png'}`);
        fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
        frames.push({ file, t });
      } catch {}
    }
  })();
};
const stop = async () => { recording = false; await loop; };

/* ---------- motion helpers ---------- */
let mx = W * Z * 0.62, my = H * Z * 0.9;
const wait = (ms) => page.waitForTimeout(ms * S);
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
async function moveTo(x, y, ms = 700) {
  const x0 = mx, y0 = my, n = Math.max(12, Math.round(ms / 16));
  const bend = Math.min(60 * Z, Math.hypot(x - x0, y - y0) * 0.12);       // arcs, not straight lines
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n), arc = Math.sin(t * Math.PI) * bend;
    await page.mouse.move(x0 + (x - x0) * t, y0 + (y - y0) * t - arc);
    await wait(ms / n);
  }
  mx = x; my = y;
}
async function center(loc) { const b = await loc.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; }
async function click(loc, ms = 700, settle = 180) {
  await loc.waitFor({ state: 'visible' });
  const vis = await loc.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 70 && r.bottom <= innerHeight - 90; });
  if (!vis) { await loc.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' })); await wait(700); }
  const [x, y] = await center(loc); await moveTo(x, y, ms); await wait(settle);
  await page.mouse.down(); await wait(70); await page.mouse.up();
}
async function type(loc, text, cps = 16) {
  await click(loc, 600, 120);
  for (const ch of text) { await page.keyboard.type(ch); await wait(1000 / cps + Math.random() * 25); }
}

async function drag(x0, y0, x1, y1, ms = 1500) {   // press, ease across, release
  await moveTo(x0, y0, 700); await wait(150);
  await page.mouse.down(); await page.evaluate(() => { const c = document.getElementById('rec-cursor'); c.classList.remove('down'); void c.offsetWidth; c.classList.add('down'); });
  const n = Math.round(ms / 16);
  for (let i = 1; i <= n; i++) { const t = ease(i / n); await page.mouse.move(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); await wait(ms / n); }
  mx = x1; my = y1; await wait(120); await page.mouse.up();
}
async function pick(sel, value) {           // native <select>: show the click, set the value
  const vis = await sel.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 70 && r.bottom <= innerHeight - 90; });
  if (!vis) { await sel.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' })); await wait(700); }
  const [sx, sy] = await center(sel); await moveTo(sx, sy, 550); await wait(120);
  await page.evaluate(() => { const c = document.getElementById('rec-cursor'); c.classList.remove('down'); void c.offsetWidth; c.classList.add('down'); });
  await wait(220); await sel.selectOption(value); await wait(300);
}
async function smooth(loc, block = 'center') { await loc.evaluate((el, b) => el.scrollIntoView({ behavior: 'smooth', block: b }), block); await wait(700); }
// Labels in the Fabric stand-in aren't tied to their inputs, so fall back to the next field after the label text
const label = (t) => page.getByLabel(t, { exact: false }).or(page.locator(`xpath=//label[starts-with(normalize-space(.), "${t}")]/following::*[self::input or self::select or self::textarea][1]`)).first();

/* ---------- clips ---------- */
try {
if (clip === 'signer') {
  await page.goto(`${BASE}/prototype?scenario=happy`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(mx, my); await wait(600);
  await start(); await wait(700);
  // pass the payment step along
  await click(page.getByRole('button', { name: /Delegate/ }).first(), 900);
  await wait(450);
  await click(page.getByText('Copy Link', { exact: true }), 500);
  await wait(1500);
  // accept the terms
  await click(page.getByRole('button', { name: 'Start' }).nth(1), 800);
  await wait(1100);
  await click(page.getByText("I've reviewed and accept", { exact: false }), 800);
  await wait(400);
  await click(page.getByRole('button', { name: 'Submit' }), 600);
  await wait(2600);
  await moveTo(W * Z * 0.62, H * Z * 0.9, 900);
  await wait(800);
} else if (clip === 'inapp') {
  await page.goto(`${BASE}/prototype?scenario=happy`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(mx, my); await wait(600);
  await start(); await wait(700);
  await click(page.getByRole('button', { name: 'Start' }).first(), 900);
  await wait(1300);
  await click(page.getByRole('button', { name: 'Next', exact: true }), 800);
  await wait(900);
  await click(page.getByRole('radio', { name: /Credit Card/ }), 800);
  await wait(600);
  // test values from the prototype's own fixture (paymentPrefill.ts FAILURE_PREFILL)
  const field = (label) => page.getByLabel(label, { exact: false }).first();
  await type(field('Card Number'), '4242 4242 4242 4242', 34);
  await type(field('Expiration Date'), '12/29', 16);
  await type(field('CVV'), '123', 16);
  await type(field('Cardholder Name'), 'Rebecca Johnson', 30);
  const smooth = async (loc) => { await loc.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' })); await wait(650); };
  await smooth(field('Billing Address Line 1'));
  await type(field('Billing Address Line 1'), '123 Main St', 32);
  await type(field('City'), 'Lindon', 28);
  // native <select>: its popup never reaches the screencast, so show the click and set the value
  const state = page.locator('select').filter({ has: page.locator('option[value="UT"]') }).first();
  const [sx, sy] = await center(state); await moveTo(sx, sy, 600); await wait(150);
  await page.evaluate(() => { const c = document.getElementById('rec-cursor'); c.classList.remove('down'); void c.offsetWidth; c.classList.add('down'); });
  await wait(250); await state.selectOption('UT'); await wait(350);
  await type(field('ZIP'), '84043', 18);
  const save = page.getByRole('button', { name: 'Save Payment Info' });
  await smooth(save);
  await click(save, 700);
  await wait(3500);
  await moveTo(W * Z * 0.62, H * Z * 0.9, 900);
  await wait(800);
} else if (clip === 'checkout') {
  await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(mx, my); await wait(500);
  await start(); await wait(600);
  await type(page.getByPlaceholder('Enter the number of employees'), '18', 8);
  await wait(250);
  await smooth(page.getByRole('radio', { name: /^Pro/ }));
  await click(page.getByRole('radio', { name: /^Pro/ }), 700);
  await wait(500);
  await click(page.getByRole('button', { name: 'Continue' }), 700);
  await wait(900);
  await click(page.getByRole('button', { name: 'Continue' }), 700);   // add-ons: none
  await wait(900);
  await click(page.locator('label.radio-option').nth(1), 700);
  await type(label('Street Address'), '123 Main St', 30);
  await type(label('City'), 'Lindon', 28);
  await pick(page.locator('select').filter({ has: page.locator('option[value="UT"]') }).first(), 'UT');
  await type(label('Zip Code'), '84043', 18);
  await click(page.getByRole('button', { name: 'Continue' }), 600);
  await wait(900);
  const phone = label('Phone Number');
  if (!(await phone.inputValue().catch(() => ''))) await type(phone, '8015550134', 20);
  const email = label('Email');
  if (!(await email.inputValue().catch(() => ''))) await type(email, 'dana@superpoolcovers.example', 34);
  await click(page.getByRole('button', { name: /Continue to Review/ }), 700);
  await wait(1200);
  const agree = page.getByText('I agree to the terms of the order form.');
  await smooth(agree);
  await click(agree, 800);
  await click(page.getByText('I have reviewed and agree', { exact: false }), 500);
  await wait(300);
  await click(page.getByRole('button', { name: 'Continue' }), 700);
  await wait(1000);
  const card = page.getByRole('radio', { name: /Card/ }).first();
  if (await card.count()) { await click(card, 600); await wait(400); }
  // test values: the universal 4242 test card
  await type(label('Cardholder Name'), 'Dana Whitfield', 30);
  await type(label('Card Number'), '4242424242424242', 34);
  await pick(page.getByLabel('Expiration month'), '12');
  await pick(page.getByLabel('Expiration year'), String(new Date().getFullYear() + 3));
  await type(label('CVV'), '123', 16);
  await type(label('Billing Zip Code'), '84043', 18);
  const go = page.getByRole('button', { name: 'Start My Subscription' });
  await click(go, 700);
  await wait(4500);
  await moveTo(W * Z * 0.62, H * Z * 0.9, 900);
  await wait(800);
} else if (clip === 'chat') {
  await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(mx, my); await wait(500);
  await start(); await wait(900);
  await type(page.getByPlaceholder('you@company.com'), 'dana@superpoolcovers.example', 30);
  await wait(250); await page.keyboard.press('Enter');
  await wait(5500);
  await click(page.getByRole('button', { name: /^Pro Starting/ }), 900);
  await wait(3500);
  const seats = page.getByPlaceholder(/Number of employees/);
  if (await seats.count()) { await type(seats, '25', 8); await wait(200); await page.keyboard.press('Enter'); await wait(4500); }
  await moveTo(W * 0.4, H * 0.6, 900);
  await wait(1200);
} else if (clip === 'trial-welcome' || clip === 'trial-hub') {
  await page.goto(`${BASE}/prototype?scenario=happy`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(mx, my); await wait(400);
  const welcome = clip === 'trial-welcome';
  if (welcome) { await start(); await wait(1400); }
  const btn = (n) => page.getByRole('button', { name: n });
  const fast = welcome ? 1 : 0.35;
  await click(btn("Let's Go"), 900 * fast); await wait(1500 * fast + 300);
  await click(btn('Construction & Trades'), 900 * fast); await wait(1400 * fast + 300);
  await click(btn("I'm leading the search."), 800 * fast); await wait(1300 * fast + 300);
  await click(btn('We have multiple locations'), 800 * fast); await wait(welcome ? 4200 : 4000);
  await click(btn(/Get new crews/), 900 * fast); await wait(1800 * fast + 400);
  await click(btn('Take Me There'), 800 * fast); await wait(welcome ? 3500 : 4000);
  if (!welcome) {
    await moveTo(W * 0.5, H * 0.45, 300); await start(); await wait(1000);
    await click(page.getByText('Trial Hub', { exact: true }).first(), 900);
    await wait(2200);
    await click(btn('Payroll').first(), 900); await wait(1800);
    await click(btn('Hiring').first(), 700); await wait(1800);
    await click(btn('For You').first(), 800); await wait(1600);
    await click(page.getByRole('button', { name: 'Close trial hub' }), 900); await wait(2000);
  }
  await moveTo(W * 0.62, H * 0.9, 900);
  await wait(900);
} else if (clip === 'hris') {
  await page.goto(`http://127.0.0.1:5181/#3`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(mx, my); await wait(900);
  await start(); await wait(1600);
  for (const st of ['02 Discovery', '03 Short list', '04 Evaluation', '05 Pricing', '06 Commit']) {
    await click(page.getByRole('button', { name: st }), 800);
    await wait(2300);
  }
  await moveTo(W * 0.62, H * 0.9, 900);
  await wait(900);
} else if (clip === 'hris-deck') {
  await page.goto(`http://127.0.0.1:5181/#0`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(mx, my); await wait(900);
  await start(); await wait(1800);
  const next = page.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 8; i++) { await click(next, i ? 300 : 900); await wait(1900); }
  await moveTo(W * 0.62, H * 0.75, 900);
  await wait(900);
} else if (clip === 'engine') {
  await page.goto('https://motorcycle-engine.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  mx = W * 0.08; my = H * 0.62; await page.mouse.move(mx, my);              // park over the side panel, off the engine
  await page.mouse.move(W * 0.82, H * 0.14); for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(120); } await page.waitForTimeout(1500);   // pull the camera back a little
  await page.mouse.move(mx, my); await page.waitForTimeout(800);
  await start(); await wait(1300);
  const range = page.locator('input[type=range]').nth(2);
  const b = await range.boundingBox();
  const ty = b.y + b.height / 2;
  await drag(b.x + 6, ty, b.x + b.width - 6, ty, 3400);       // explode
  await wait(1600);
  await drag(W * 0.86, H * 0.16, W * 0.76, H * 0.165, 2600);   // gentle orbit, grabbed from empty space
  await moveTo(W * 0.08, H * 0.62, 900);
  await wait(1400);
  await drag(b.x + b.width - 6, ty, b.x + 6, ty, 2800);        // back together
  await wait(1500);
} else if (clip === 'glass') {
  await page.goto('https://glass-therapy.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  mx = W * 0.5; my = H * 0.86; await page.mouse.move(mx, my);
  await start(); await wait(1200);
  await moveTo(W * 0.66, H * 0.30, 1400); await wait(500);       // parallax + hover through the shards
  await moveTo(W * 0.68, H * 0.40, 900); await wait(500);
  await moveTo(W * 0.25, H * 0.45, 1500); await wait(400);
  await moveTo(W * 0.26, H * 0.82, 1000); await wait(300);
  await page.mouse.down(); await wait(70); await page.mouse.up();   // Meet Dr. Calloway
  await wait(3600);
  const back = page.getByRole('button', { name: /Back/ }).first();
  if (await back.count()) { await click(back, 1200); } else { await page.screenshot({ path: 'glass-noback.png' }); }
  await wait(3500);
  await moveTo(W * 0.5, H * 0.86, 1000);
  await wait(800);
} else if (clip === 'wellspring') {
  await page.goto('https://wellspring-group.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  mx = W * 0.8; my = H * 0.75; await page.mouse.move(mx, my);
  await start(); await wait(1500);
  await moveTo(W * 0.52, H * 0.35, 1300); await wait(300);          // stir the bubbles
  await moveTo(W * 0.47, H * 0.6, 900); await wait(300);
  await moveTo(W * 0.56, H * 0.2, 1000); await wait(600);
  await moveTo(W * 0.8, H * 0.6, 900);
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 60); await wait(110); }   // scroll through the story
  await wait(1500);
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 60); await wait(110); }
  await wait(2000);
} else if (clip === 'vantage') {
  await page.goto('https://vantage-financial-five.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  mx = W * 0.6; my = H * 0.9; await page.mouse.move(mx, my);
  await start(); await wait(1000);
  const btn = (n) => page.getByRole('button', { name: n, exact: true });
  await click(btn('1Y'), 900); await wait(1300);
  await click(btn('5Y'), 500); await wait(1300);
  await click(btn('1M'), 500); await wait(900);
  await moveTo(W * 0.24, H * 0.50, 700);                                  // scrub along the chart
  for (let i = 1; i <= 40; i++) { await page.mouse.move(W * 0.24 + (W * 0.42) * i / 40, H * 0.47 - Math.sin(i / 40 * 3) * 30); await wait(45); }
  mx = W * 0.66; my = H * 0.47 - Math.sin(3) * 30; await wait(500);
  await click(btn('Edit layout'), 1000); await wait(900);
  const grip = page.locator('text=Today\'s P&L').first();
  const g = await grip.boundingBox();
  const gx = W * 0.955, gy = g.y + g.height / 2;
  await drag(gx, gy, W * 0.40, H * 0.30, 2200);                           // move a widget
  await wait(1500);
  await click(btn('Done'), 1000); await wait(1400);
  await moveTo(W * 0.6, H * 0.9, 900);
  await wait(700);
} else if (clip === 'payer') {
  await page.goto(`${BASE}/pay/demo`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(mx, my); await wait(600);
  await start(); await wait(900);
  await click(page.getByRole('button', { name: /Credit Card/ }).or(page.getByText('Credit Card', { exact: true })).first(), 900);
  await wait(500);
  // test values from the prototype's own fixture (paymentPrefill.ts)
  await type(page.locator('input[name="cardName"]'), 'Rebecca Johnson');
  await type(page.locator('input[name="cardNumber"]'), '4242424242424242', 22);
  await type(page.locator('input[name="expiry"]'), '1229', 10);
  await type(page.locator('input[name="cvv"]'), '123', 10);
  await type(page.locator('input[name="zip"]'), '84043', 10);
  await wait(300);
  const submit = page.getByRole('button', { name: /Add Payment Method/ });
  await submit.scrollIntoViewIfNeeded().catch(() => {});
  await click(submit, 800);
  await wait(3500);
  await moveTo(W * Z * 0.8, H * Z * 0.85, 900);
  await wait(800);
}
} catch (e) { await page.screenshot({ path: 'fail.png' }); console.log('FAIL', e.message.split('\n')[0]); await browser.close(); process.exit(1); }
await stop();
fs.writeFileSync(path.join(out, 'frames.json'), JSON.stringify(frames));
console.log(clip, frames.length, 'frames', ((frames.at(-1).t - frames[0].t)).toFixed(1) + 's');
await browser.close();
