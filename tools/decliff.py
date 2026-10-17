"""Take the soil edge off the bottom of a plot picture, so the plot sits flat on
the world's ground instead of floating like a block.

Usage:
    python tools/decliff.py <in.webp> <out.webp> <edge_px>

edge_px is how tall the soil edge is in the picture (measure it once: it is the
same all along the front of a plot). In every column, the bottom edge_px pixels
of the picture (its lowest run, the plot's front) are made see-through, unless
they are leaves (a tree hanging over the edge), and the new edge fades out over
a few pixels. Higher runs are left alone: a gap between leaves is not an edge.
"""
import sys

import numpy as np
from PIL import Image

src, out, edge = sys.argv[1], sys.argv[2], int(sys.argv[3])
FADE = 6
im = Image.open(src).convert('RGBA')
px = np.asarray(im).astype(float)
alpha = px[..., 3].copy()
hsv = np.asarray(im.convert('RGB').convert('HSV')).astype(float)
hue, sat = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
leafy = (hue > 55) & (hue < 160) & (sat > 0.3)
height, width = alpha.shape
solid = alpha > 30
for x in range(width):
    ys = np.nonzero(solid[:, x])[0]
    if not len(ys):
        continue
    y = ys[-1]
    top = max(0, y - edge + 1)
    if leafy[max(top, y - 12):y + 1, x].mean() < 0.5:
        alpha[top:y + 1, x] = 0
        for k in range(1, FADE + 1):  # a soft new edge
            if top - k >= 0:
                alpha[top - k, x] *= k / (FADE + 1)
px[..., 3] = alpha
Image.fromarray(px.astype(np.uint8), 'RGBA').save(out, quality=88, alpha_quality=95, method=6)
print(out)
