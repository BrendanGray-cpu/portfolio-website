import json, sys
from PIL import Image
name, n = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 8
fr = json.load(open(f'out-{name}/frames.json')); t0 = fr[0]['t']; T = fr[-1]['t'] - t0
ims = []
for k in range(n):
    p = T * (k + 0.5) / n
    f = min(fr, key=lambda x: abs(x['t'] - t0 - p)); im = Image.open(f['file']); w, h = im.size
    ims.append(im.resize((w // 5, h // 5)))
w, h = ims[0].size; cols = 2; rows = (n + 1) // 2
sheet = Image.new('RGB', (w * cols, h * rows), 'white')
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(f'sheet-{name}.png'); print(round(T, 1), 's,', len(fr), 'frames,', round(len(fr) / T, 1), 'fps')
