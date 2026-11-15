# Case study clip recorder

Records a prototype flow as 2x PNG frames (CDP screencast, page zoomed 2x because the screencast ignores deviceScaleFactor), draws an eased cursor, then encodes an H.264 MP4 plus poster.

1. Serve the prototype's production build (dev builds show the Agentation toolbar): `npx vite preview --port 5181` in the prototype folder.
2. `npm i playwright@1.57.0` in a scratch folder; the script points at the cached chromium_headless_shell-1228.
3. `node record.mjs signer out-signer` (add a clip branch per flow), then `python3 encode.py signer 1920 ../../assets/video/<name>.mp4` and grab frame 1 as `<name>.jpg`.
4. In content: `[video <name>.mp4 | caption | narrow]` (narrow caps the width at 520px for portrait clips).

Test values come from the prototype's own fixtures (e.g. the 4242 test card in paymentPrefill.ts).

## Notes from the full pass (2026-11-14)

- Capture is a `Page.captureScreenshot` loop at true 2x (~30fps). The CDP screencast only gives CSS-pixel frames, and zooming the page breaks vh layouts.
- WebGL sites (engine, glass, wellspring, vantage) run in GPU Chrome (`channel: 'chrome'`, ANGLE Metal) in slow motion: page time runs at 1/3 speed (performance.now, Date.now, rAF, timers, CSS animations) and frames are retimed back, so ~14fps capture becomes ~40fps+. Software WebGL in the headless shell manages under 1fps, so don't use it.
- `click()` scrolls smoothly to off-screen targets first. Native `<select>` popups never render, so `pick()` shows the click and sets the value.
- Fabric stand-in labels aren't linked to inputs; `label()` falls back to the next field after the label text.
- Encode: `python3 encode.py <clip> <width> <out.mp4> [speed]`. Long flows use 1.25–1.7x.
