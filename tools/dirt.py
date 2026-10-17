"""A seamless painted-dirt tile (512 px) for the roads between areas, in the Barnyard path's colours.

Usage:
    python tools/dirt.py <out.webp>
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import sys
N = 512
rng = np.random.default_rng(7)

def periodic_noise(cells):
    g = rng.random((cells, cells))
    g = np.vstack([g, g[:1]]); g = np.hstack([g, g[:, :1]])
    t = np.linspace(0, cells, N, endpoint=False)
    i = t.astype(int); f = t - i; f = f * f * (3 - 2 * f)
    a = g[np.ix_(i, i)]; b = g[np.ix_(i, i + 1)]; c = g[np.ix_(i + 1, i)]; d = g[np.ix_(i + 1, i + 1)]
    fx = f[None, :]; fy = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

n = sum(periodic_noise(c) * w for c, w in ((4, 0.45), (8, 0.25), (16, 0.15), (32, 0.1), (64, 0.05)))
n = (n - n.min()) / (n.max() - n.min())
light, dark = np.array([228, 196, 136]), np.array([196, 160, 102])
img = dark + (light - dark) * n[..., None]
img += rng.normal(0, 4, (N, N, 1))  # grain
pic = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
# Pebbles and a few darker specks, drawn wrapped so the tile stays seamless.
layer = Image.new('RGBA', (N * 3, N * 3), (0, 0, 0, 0))
d = ImageDraw.Draw(layer)
stones = [(rng.random() * N, rng.random() * N, 3 + rng.random() * 7, 0.6 + rng.random() * 0.4) for _ in range(45)]
specks = [(rng.random() * N, rng.random() * N, 1 + rng.random() * 2) for _ in range(160)]
for ox in (0, N, 2 * N):
    for oy in (0, N, 2 * N):
        for x, y, r, sq in stones:
            x, y = x + ox, y + oy
            d.ellipse([x - r, y - r * sq + r * 0.35, x + r, y + r * sq + r * 0.35], fill=(120, 96, 62, 150))  # its shadow
            shade = int(rng.integers(135, 180))
            d.ellipse([x - r, y - r * sq, x + r, y + r * sq], fill=(shade + 32, shade + 22, shade + 4, 255))
            d.ellipse([x - r * 0.55, y - r * sq * 0.75, x + r * 0.2, y - r * sq * 0.1], fill=(255, 240, 215, 70))  # a highlight
        for x, y, r in specks:
            x, y = x + ox, y + oy
            d.ellipse([x - r, y - r, x + r, y + r], fill=(150, 118, 76, 120))
layer = layer.filter(ImageFilter.GaussianBlur(0.6)).crop((N, N, 2 * N, 2 * N))
pic = pic.convert('RGBA'); pic.alpha_composite(layer)
pic.convert('RGB').save(sys.argv[1], quality=85, method=6)
