"""Find where the farmer can stand on each plot picture: paths, grass and floor,
not water, buildings, trees, fences or bales.

Usage:
    python tools/walkmask.py [preview_dir]

Prints the PLOT_WALK table to paste into game.js. Each plot becomes a 100 x 100
grid over its picture (1% across by 1% down), each cell one of:
    0 blocked, 1 grass, 2 path or floor, 3 not part of the picture (the meadow).
The cells are packed four to a byte, first cell in the top bits, and the bytes
are base64-encoded. With a preview_dir, the cells she can stand on are tinted
pink on a copy of each picture there (wm_<plot>.png), to check by eye.

The colours pick out the ground; BLOCK lists, in % of the picture, the bits the
colours get wrong (a fenced run, sacks on a barn floor). Add a new plot's
PLOT_SHAPE (from game.js) to SHAPE, run it, and look at its preview.
"""
import base64
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

# From game.js: the ground diamond's middle (% across, % down), its width (% of
# the picture's) and the picture's height over width.
SHAPE = {
    'barnyard': [50, 53, 97.5, 0.759], 'henhouse': [50, 54, 97.5, 0.72],
    'bigbarn': [50, 58, 97.2, 0.852], 'fieldgate': [50, 52, 97.8, 0.609],
}
INDOORS = {'bigbarn'}
BLOCK = {
    'henhouse': [[[46, 30], [62, 18], [98, 52], [86, 58], [70, 57], [58, 52], [46, 44]]],  # the chicken run
    'bigbarn': [[[40, 24], [52, 22], [56, 35], [50, 48], [40, 44]]],  # the grain sacks
}
W = 400  # the size the colours are judged at


def box_mean(a, k):
    r = k // 2
    c = np.pad(np.pad(a, r, mode='edge').cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    h, w = a.shape
    return (c[k:k + h, k:k + w] - c[0:h, k:k + w] - c[k:k + h, 0:w] + c[0:h, 0:w]) / (k * k)


def grow(m, n=1):
    for _ in range(n):
        p = np.pad(m, 1)
        m = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return m


def shrink(m, n=1):
    return ~grow(~m, n)


def big_parts(m, least):
    """Only the patches of at least `least` cells."""
    seen = np.zeros(m.shape, bool)
    keep = np.zeros(m.shape, bool)
    h, w = m.shape
    for y, x in zip(*np.nonzero(m)):
        if seen[y, x]:
            continue
        part, q = [], deque([(y, x)])
        seen[y, x] = True
        while q:
            a, b = q.popleft()
            part.append((a, b))
            for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                if 0 <= c < h and 0 <= d < w and m[c, d] and not seen[c, d]:
                    seen[c, d] = True
                    q.append((c, d))
        if len(part) >= least:
            for a, b in part:
                keep[a, b] = True
    return keep


def plot_mask(name):
    ax, ay, aw, _ = SHAPE[name]
    im = Image.open(f'assets/plots/{name}.webp').convert('RGBA')
    hgt = round(W * im.height / im.width)
    px = np.asarray(im.resize((W, hgt), Image.LANCZOS))
    rgb, alpha = px[..., :3], px[..., 3] / 255
    hsv = np.asarray(Image.fromarray(rgb).convert('HSV')).astype(float) / 255
    h, s, v = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    sd = np.sqrt(np.maximum(box_mean(v * v, 5) - box_mean(v, 5) ** 2, 0))  # how busy it looks
    grass = (h > 60) & (h < 120) & (s > 0.3) & (v > 0.42) & (sd < 0.09)
    path = ((s < 0.28) & (v > 0.5) & (sd < 0.13)) | ((h > 22) & (h < 55) & (s > 0.15) & (s < 0.6) & (v > 0.55) & (sd < 0.1))
    if name in INDOORS:  # floorboards and the rug
        path |= ((h > 18) & (h < 42) & (s > 0.35) & (v > 0.38) & (sd < 0.12)) | ((((h > 200) & (h < 250)) | (h < 10) | (h > 340)) & (s > 0.3))
    yy, xx = np.mgrid[0:hgt, 0:W]
    hw = aw / 100 * W / 2
    ground = np.abs(xx - ax / 100 * W) / hw + np.abs(yy - ay / 100 * hgt) / (hw * 0.6) <= 0.97
    stand = (grass | path) & (alpha > 0.9) & ground
    stand = big_parts(shrink(grow(stand), 3), 150)
    no = Image.new('L', (W, hgt), 0)
    for poly in BLOCK.get(name, []):
        ImageDraw.Draw(no).polygon([(x / 100 * W, y / 100 * hgt) for x, y in poly], fill=1)
    stand &= ~np.asarray(no, bool)
    cells = np.where(stand & path, 2, np.where(stand, 1, np.where(alpha < 0.1, 3, 0))).astype(np.uint8)
    return rgb, stand, cells


def grid(cells):
    """The cells at 100 x 100: each the commonest value under it."""
    hgt, w = cells.shape
    out = np.zeros((100, 100), np.uint8)
    for r in range(100):
        for c in range(100):
            patch = cells[r * hgt // 100:max(r * hgt // 100 + 1, (r + 1) * hgt // 100), c * w // 100:max(c * w // 100 + 1, (c + 1) * w // 100)]
            out[r, c] = np.bincount(patch.ravel(), minlength=4).argmax()
    return out


def pack(g):
    flat = g.ravel()
    data = bytes((flat[i] << 6) | (flat[i + 1] << 4) | (flat[i + 2] << 2) | flat[i + 3] for i in range(0, flat.size, 4))
    return base64.b64encode(data).decode()


def main():
    preview = sys.argv[1] if len(sys.argv) > 1 else None
    lines = []
    for name in SHAPE:
        rgb, stand, cells = plot_mask(name)
        lines.append(f"    {name}: '{pack(grid(cells))}',")
        if preview:
            tint = rgb.copy()
            tint[stand] = (tint[stand] * 0.4 + np.array([255, 0, 255]) * 0.6).astype(np.uint8)
            Image.fromarray(tint).save(f'{preview}/wm_{name}.png')
    print('const PLOT_WALK = {\n' + '\n'.join(lines) + '\n};')


if __name__ == '__main__':
    main()
