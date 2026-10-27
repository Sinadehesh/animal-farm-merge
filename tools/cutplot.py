"""Cut a plot picture out of its flat magenta background (Gemini), ready for
tools/decliff.py and tools/brighten.py.

Usage:
    python tools/cutplot.py <in.jpg> <out.webp> [width]

width (2000): the cut-out's width, the size of the other plots.

The background goes by its colour (the median of the picture's border), with
soft edges, and the magenta mixed into the rim is taken back out. Specks away
from the plot are dropped, and the picture is cropped to the plot with a 16 px
margin, like the other plots in assets/map/plots/.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

LOW, HIGH = 30, 90  # colour distance from the background: under LOW see-through, over HIGH solid
PAD = 16

src, out = sys.argv[1], sys.argv[2]
rgb = np.asarray(Image.open(src).convert('RGB')).astype(float)
border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
bg = np.median(border, 0)
dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
alpha = np.clip((dist - LOW) / (HIGH - LOW), 0, 1)
fg = np.clip(bg + (rgb - bg) / np.maximum(alpha, 0.2)[..., None], 0, 255)
# Only the plot and what touches it: the biggest blob (found on a coarse grid), a little grown.
STEP = 4
small = (alpha > 0.5)[::STEP, ::STEP]
seen = np.zeros(small.shape, np.int32)
best, best_n, label = 0, 0, 0
h, w = small.shape
for y, x in zip(*np.nonzero(small)):
    if seen[y, x]:
        continue
    label += 1
    q, n = deque([(y, x)]), 0
    seen[y, x] = label
    while q:
        a, b = q.popleft()
        n += 1
        for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
            if 0 <= c < h and 0 <= d < w and small[c, d] and not seen[c, d]:
                seen[c, d] = label
                q.append((c, d))
    if n > best_n:
        best, best_n = label, n
keep = seen == best
for _ in range(2):
    p = np.pad(keep, 1)
    keep = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
mask = np.repeat(np.repeat(keep, STEP, 0), STEP, 1)[:alpha.shape[0], :alpha.shape[1]]
alpha = alpha * mask
ys, xs = np.nonzero(alpha > 0.05)
y0, y1, x0, x1 = max(0, ys.min() - PAD), min(rgb.shape[0], ys.max() + PAD + 1), max(0, xs.min() - PAD), min(rgb.shape[1], xs.max() + PAD + 1)
px = np.dstack([fg, alpha * 255])[y0:y1, x0:x1].round().astype(np.uint8)
im = Image.fromarray(px, 'RGBA')
width = int(sys.argv[3]) if len(sys.argv) > 3 else 2000
if im.width > width:
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
im.save(out, quality=92, alpha_quality=95, method=6)
print(out, im.width, 'x', im.height)
