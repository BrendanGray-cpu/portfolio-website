/* ============================================================
   main.js — boot: fonts → nav → intro (once per session) → route
   ============================================================ */
import { Router } from "./router.js";
import { initNav } from "./nav.js";
import { shouldPlayIntro, playIntro } from "./intro.js";
import { sleep } from "./util.js";

async function fontsReady() {
  if (!document.fonts?.load) return;
  await Promise.race([
    Promise.all([document.fonts.load('500 16px "Darker Grotesque"'), document.fonts.load('700 16px "Darker Grotesque"')]),
    sleep(1500),
  ]);
}

async function boot() {
  const main = document.getElementById("main");
  const layer = document.getElementById("morph-layer");
  const navEl = document.getElementById("nav");
  const nav = initNav(navEl);
  const router = new Router({ main, layer, nav });
  window.__router = router;

  if (shouldPlayIntro(location.pathname)) {
    const intro = playIntro();
    await fontsReady();
    const page = await router.start({ enter: false });
    await intro;
    await nav.show({ slow: true });
    await page.enter({ mode: "slow" });
    router._focus(page);
  } else {
    await fontsReady();
    nav.show();
    await router.start();
  }
}

boot();
