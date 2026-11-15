"""Turn Brendan's scanned intro sheets into ink layers + stroke paths for js/intro.js.

    ~/.venvs/headlab/bin/python tools/scans/process_scans.py <scan.pdf> [--map 0=brief,1=first,...]

For each sheet:
  1. find the light-blue frame (its two long edges are the longest blue lines on the page),
     turn the page so the printed header is on top, and crop to the frame;
  2. keep only the ink: alpha from darkness, blue guides dropped, specks removed;
  3. sheet "notes": erase anything inside the layout boxes (mistakes he asked to drop);
  4. thin the ink to centerlines, walk them into strokes, order them for reading
     (top to bottom in bands, left to right), and save them as polylines.

Writes assets/intro/<name>.png (black ink on transparent, 2x) and assets/intro/<name>.json:
  { w, h, brush, strokes: [[x, y, x, y, ...], ...] } in 1x frame pixels (hero frame = 1440 × 900).
"""
import json, sys, os, subprocess, tempfile
import numpy as np, cv2

SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(SITE, 'assets', 'intro')
# hero layout boxes at 1440 × 900 (measured from the live page when the template was made)
BOXES = {'nav': (562, 16, 315, 44), 'name': (120, 176, 355, 188), 'role': (120, 435, 576, 33), 'para': (120, 564, 479, 336),
         'head': (779, 179, 507, 507), 'mood': (961, 728, 142, 32)}
SIZES = {'brief': (1500, 800)}            # 1x size; hero sheets are 1440 × 900
DEFAULT_MAP = {0: 'brief', 1: 'first', 2: 'scribble', 3: 'sketch', 4: 'notes'}


def pages(pdf):
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdfimages', '-j', pdf, os.path.join(tmp, 'p')], check=True)
    return [cv2.imread(os.path.join(tmp, f)) for f in sorted(os.listdir(tmp)) if f.endswith('.jpg')]


def blue_mask(im):
    b, g, r = [im[:, :, k].astype(np.int16) for k in range(3)]
    return ((b - r) > 20) & (b > 140)


def frame(im):
    """Frame edges: the long blue lines. Returns (x0, y0, x1, y1) of the frame on the page."""
    bl = blue_mask(im).astype(np.uint8)
    H, W = bl.shape

    def lines(sums, n):
        idx = np.nonzero(sums > 0.3 * n)[0]
        groups = []
        for v in idx:
            if groups and v - groups[-1][1] <= 6: groups[-1][1] = v
            else: groups.append([v, v])
        return [(a + b) // 2 for a, b in groups]
    xs, ys = lines(bl.sum(0), H), lines(bl.sum(1), W)
    if len(xs) < 2 or len(ys) < 2:      # short brief box: relax
        xs, ys = lines(bl.sum(0), H * 0.5), lines(bl.sum(1), W * 0.5)
    return min(xs), min(ys), max(xs), max(ys)


def upright(im, f):
    """Rotate so the printed header (dark text just outside the frame) ends up on top."""
    x0, y0, x1, y1 = f
    g = im.mean(axis=2)
    strips = {'left': (g[y0:y1, max(0, x0 - 420):x0 - 80] < 120).sum(), 'right': (g[y0:y1, x1 + 80:x1 + 420] < 120).sum(),
              'top': (g[max(0, y0 - 420):y0 - 80, x0:x1] < 120).sum(), 'bottom': (g[y1 + 80:y1 + 420, x0:x1] < 120).sum()}
    side = max(strips, key=strips.get)
    crop = im[y0:y1, x0:x1]
    return {'top': crop, 'left': cv2.rotate(crop, cv2.ROTATE_90_CLOCKWISE), 'right': cv2.rotate(crop, cv2.ROTATE_90_COUNTERCLOCKWISE),
            'bottom': cv2.rotate(crop, cv2.ROTATE_180)}[side]


def ink_alpha(crop):
    inset = 30                                   # drop the frame line itself
    crop = crop[inset:-inset, inset:-inset]
    gray = crop.mean(axis=2)
    paper, dark = np.percentile(gray, 92), np.percentile(gray, 0.2)
    a = np.clip((paper - gray - 14) / max(1, paper - dark - 14), 0, 1)
    a[blue_mask(crop)] = 0
    a = np.power(a, 0.8)
    # drop specks
    n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 0.3).astype(np.uint8), 8)
    small = np.zeros(n, bool); small[1:] = stats[1:, cv2.CC_STAT_AREA] < 40
    # and faint gray marks (show-through, erased pencil): components that never get properly dark
    peak = np.zeros(n); np.maximum.at(peak, lab.ravel(), a.ravel())
    small |= peak < 0.6; small[0] = False
    a[small[lab]] = 0
    return a


def strokes_from(alpha2x, scale):
    """Centerlines → ordered polylines in 1x pixels."""
    bw = (alpha2x > 0.35).astype(np.uint8) * 255
    bw = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    dist = cv2.distanceTransform(bw, cv2.DIST_L2, 3)
    sk = cv2.ximgproc.thinning(bw) > 0
    pts = set(zip(*np.nonzero(sk)))
    nb = lambda y, x: [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (y + dy, x + dx) in pts]
    brush = float(np.percentile(dist[sk], 90)) * 2 + 3 if sk.any() else 6

    # components of the skeleton, ordered for reading: bands of ~70 px (1x), then left to right
    n, lab = cv2.connectedComponents(sk.astype(np.uint8), connectivity=8)
    comps = []
    for c in range(1, n):
        ys, xs = np.nonzero(lab == c)
        if len(ys) < 6: continue
        comps.append((int(ys.mean() / scale // 70), xs.min(), c))
    comps.sort()
    seen, out = set(), []
    for _, _, c in comps:
        cp = set(zip(*np.nonzero(lab == c)))
        while True:
            left = cp - seen
            if not left: break
            ends = [p for p in left if len([q for q in nb(*p) if q not in seen]) <= 1]
            start = min(ends or left, key=lambda p: (p[1], p[0]))       # leftmost loose end
            path, cur, prev = [start], start, None
            seen.add(start)
            while True:
                nxt = [q for q in nb(*cur) if q not in seen]
                if not nxt: break
                if prev is not None:                                     # keep going straight where it forks
                    d = (cur[0] - prev[0], cur[1] - prev[1])
                    nxt.sort(key=lambda q: -((q[0] - cur[0]) * d[0] + (q[1] - cur[1]) * d[1]))
                prev, cur = cur, nxt[0]
                seen.add(cur); path.append(cur)
            if len(path) >= 4:
                poly = np.array([[x / scale, y / scale] for y, x in path], np.float32).reshape(-1, 1, 2)
                poly = cv2.approxPolyDP(poly, 0.7, False).reshape(-1, 2)
                out.append([round(float(v), 1) for p in poly for v in p])
    return out, brush / scale


def main():
    pdf = sys.argv[1]
    mapping = DEFAULT_MAP
    if '--map' in sys.argv:
        mapping = {int(k): v for k, v in (kv.split('=') for kv in sys.argv[sys.argv.index('--map') + 1].split(','))}
    os.makedirs(OUT, exist_ok=True)
    for i, im in enumerate(pages(pdf)):
        name = mapping.get(i)
        if not name: continue
        crop = upright(im, frame(im))
        a = ink_alpha(crop)
        W1, H1 = SIZES.get(name, (1440, 900))
        a2 = cv2.resize(a, (W1 * 2, H1 * 2), interpolation=cv2.INTER_AREA)
        if name == 'notes':                      # drop the marks he made inside the layout boxes
            for bx, by, bw_, bh in BOXES.values():
                p = 6
                a2[max(0, (by - p) * 2):(by + bh + p) * 2, max(0, (bx - p) * 2):(bx + bw_ + p) * 2] = 0
        rgba = np.zeros((H1 * 2, W1 * 2, 4), np.uint8)
        rgba[:, :, 0:3] = 17
        rgba[:, :, 3] = (np.clip(a2, 0, 1) * 255).astype(np.uint8)
        cv2.imwrite(os.path.join(OUT, f'{name}.png'), rgba, [cv2.IMWRITE_PNG_COMPRESSION, 9])
        strokes, brush = strokes_from(a2, 2)
        with open(os.path.join(OUT, f'{name}.json'), 'w') as f:
            json.dump({'w': W1, 'h': H1, 'brush': round(brush, 2), 'strokes': strokes}, f, separators=(',', ':'))
        print(f'{name}: {len(strokes)} strokes, brush {brush:.1f}px, {sum(len(s) // 2 for s in strokes)} points')


if __name__ == '__main__':
    main()
