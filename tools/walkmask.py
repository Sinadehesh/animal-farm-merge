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

The colours pick out the ground (never water, which can read as path); BLOCK
lists, in % of the picture, the bits the colours get wrong (a fenced run, sacks
on a barn floor, benches and barrels on a square). Add a new plot's
PLOT_SHAPE (from game.js) to SHAPE, run it, and look at its preview. The
pictures are the ones assets.js names, brightened (tools/brighten.py); their
colours are judged as they were before that.
"""
import base64
import re
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

from brighten import ungrade

# From game.js: the ground diamond's middle (% across, % down), its width (% of
# the picture's) and the picture's height over width.
SHAPE = {
    'barnyard': [50, 53, 97.5, 0.759], 'henhouse': [50, 54, 97.5, 0.72],
    'bigbarn': [50, 58, 97.2, 0.852], 'fieldgate': [50, 52, 97.8, 0.609],
    'town': [50, 50, 95, 0.614], 'market': [50, 52, 117, 1.558],
}
NO_DIAMOND = {'market'}  # not a square plot: its whole picture is ground
INDOORS = {'bigbarn'}
ALL_GROUND = {'town'}  # its cobbles are too busy for the colour test: all its ground counts, less BLOCK
BLOCK = {
    'barnyard': [[[15, 46], [26, 46], [26, 57], [15, 57]], [[43, 28], [49, 28], [49, 39], [43, 39]]],  # a hay bale, the barn door
    'henhouse': [[[46, 30], [62, 18], [98, 52], [86, 58], [70, 57], [58, 52], [46, 44]]],  # the chicken run
    'bigbarn': [[[40, 24], [52, 22], [56, 35], [50, 48], [40, 44]],  # the grain sacks
                [[29, 66], [53, 66], [53, 92], [29, 92]], [[50, 70], [61, 70], [61, 86], [50, 86]],  # the workbench, a barrel
                [[15, 61], [20, 61], [20, 71], [15, 71]], [[60, 66], [66, 66], [66, 78], [60, 78]], [[63, 51], [69, 51], [69, 59], [63, 59]]],  # lanterns
    'market': [  # the store, stalls, fountain and well (pale stone and canvas read as path)
        [[36, 0], [64, 0], [66, 22], [56, 27], [42, 27], [34, 20]], [[8, 13], [30, 15], [31, 34], [20, 37], [9, 30]],
        [[69, 14], [90, 18], [91, 34], [80, 37], [70, 30]], [[33, 39], [50, 34], [67, 41], [67, 55], [50, 61], [33, 55]],
        [[5, 40], [30, 42], [32, 58], [18, 60], [6, 55]], [[70, 40], [95, 43], [95, 57], [80, 60], [70, 54]],
        [[26, 63], [42, 65], [42, 82], [34, 84], [26, 80]], [[55, 60], [84, 63], [84, 79], [68, 82], [55, 78]],
        [[29, 23], [39, 23], [39, 34], [29, 34]], [[25, 66], [43, 66], [43, 85], [25, 85]],  # the telescope, the well
        [[74, 69], [84, 69], [84, 80], [74, 80]], [[67, 49], [79, 49], [79, 58], [67, 58]],  # the sign board, the chest
    ],
    'town': [  # the houses, the fountain, the stage, the notice board, the dock and canal
        [[26, 6], [45, 6], [46, 40], [36, 42], [26, 36]], [[44, 41], [56, 41], [56, 57.5], [44, 57.5]],
        [[51, 15], [61, 15], [61, 30], [51, 30]], [[53, 33], [61, 33], [61, 48], [53, 48]],
        [[57, 52], [78, 52], [78, 76], [62, 78], [57, 70]], [[24, 47], [42, 47], [42, 66], [24, 66]],
        [[22, 64], [47, 72], [47, 88], [22, 78]], [[9, 23], [28, 23], [29, 50], [9, 50]], [[67, 22], [88, 22], [88, 50], [67, 50]],
        # and the things standing on the square: benches, flower barrels, poles, lamps, troughs, sawhorses, the fences
        [[40.5, 45.5], [46, 45.5], [46, 50.5], [40.5, 50.5]], [[39.5, 52.5], [45, 52.5], [45, 59], [39.5, 59]],
        [[44.5, 57], [50, 57], [50, 63], [44.5, 63]], [[39, 48], [42.5, 48], [42.5, 54], [39, 54]],
        [[46, 41], [49, 41], [49, 47], [46, 47]], [[49, 59], [52, 59], [52, 64.5], [49, 64.5]],
        [[38, 42], [40, 42], [40, 56], [38, 56]], [[49, 32], [51, 32], [51, 45], [49, 45]], [[49.5, 19], [53, 19], [53, 32], [49.5, 32]],
        [[60.5, 40.5], [63.5, 40.5], [63.5, 54.5], [60.5, 54.5]], [[57.5, 51.5], [61, 51.5], [61, 57.5], [57.5, 57.5]],
        [[63.5, 34], [69.5, 34], [69.5, 46], [63.5, 46]], [[75, 48], [79.5, 48], [79.5, 54], [75, 54]], [[87.5, 45], [93, 45], [93, 51], [87.5, 51]],
        [[84.5, 61], [84.5, 52], [96, 44], [97, 46], [97, 53], [87, 61.5]],
        [[14.5, 52], [18, 52], [18, 59.5], [14.5, 59.5]], [[18.5, 50.5], [22.5, 50.5], [22.5, 57], [18.5, 57]],
        [[25.5, 62], [30, 62], [30, 70], [25.5, 70]], [[38.8, 64.5], [44.5, 64.5], [44.5, 72.5], [38.8, 72.5]],
        [[55.8, 65.5], [60.5, 65.5], [60.5, 74], [55.8, 74]], [[61.5, 68], [72.5, 68], [72.5, 79], [61.5, 79]],
        [[42, 4], [54, 4], [54, 27], [42, 27]], [[45, 74], [57, 74], [57, 92], [45, 92]], [[1, 37], [8, 37], [8, 52], [1, 52]], [[92, 36], [99, 36], [99, 53], [92, 53]],  # trees
        [[6, 46], [13, 46], [13, 55], [6, 55]], [[59, 23], [62, 23], [62, 30], [59, 30]], [[51, 15], [61, 15], [61, 33], [51, 33]],  # logs, a pot, the stage's step
    ],
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
    path = re.search(rf"\b{name}: '(assets/map/plots/[^']+)'", open('assets.js').read()).group(1)
    im = Image.open(path).convert('RGBA')
    hgt = round(W * im.height / im.width)
    px = np.asarray(im.resize((W, hgt), Image.LANCZOS))
    rgb, alpha = px[..., :3], px[..., 3] / 255
    drawn = ungrade(rgb.astype(float)).round().astype(np.uint8)  # the colours below were set before tools/brighten.py
    hsv = np.asarray(Image.fromarray(drawn).convert('HSV')).astype(float) / 255
    h, s, v = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    sd = np.sqrt(np.maximum(box_mean(v * v, 5) - box_mean(v, 5) ** 2, 0))  # how busy it looks
    grass = (h > 60) & (h < 120) & (s > 0.3) & (v > 0.42) & (sd < 0.09)
    path = ((s < 0.28) & (v > 0.5) & (sd < 0.13)) | ((h > 22) & (h < 55) & (s > 0.15) & (s < 0.6) & (v > 0.55) & (sd < 0.1))
    if name in INDOORS:  # floorboards and the rug
        path |= ((h > 18) & (h < 42) & (s > 0.35) & (v > 0.38) & (sd < 0.12)) | ((((h > 200) & (h < 250)) | (h < 10) | (h > 340)) & (s > 0.3))
    yy, xx = np.mgrid[0:hgt, 0:W]
    hw = aw / 100 * W / 2
    ground = np.abs(xx - ax / 100 * W) / hw + np.abs(yy - ay / 100 * hgt) / (hw * 0.6) <= 0.97
    if name in NO_DIAMOND:
        ground = np.ones_like(ground)
    stand = (np.ones_like(grass) if name in ALL_GROUND else grass | path) & (alpha > 0.9) & ground
    wet = grow((h > 165) & (h < 235) & (s > 0.12) & (v > 0.35), 8) if name not in INDOORS else np.zeros_like(grass)
    stand &= ~wet  # never in water (pale water reads as path), nor at its very edge
    stand = big_parts(shrink(grow(stand), 3), 150)
    no = Image.new('L', (W, hgt), 0)
    for poly in BLOCK.get(name, []):
        ImageDraw.Draw(no).polygon([(x / 100 * W, y / 100 * hgt) for x, y in poly], fill=1)
    no = grow(np.asarray(no, bool), 2)  # with a little room round each
    stand = big_parts(stand & ~no, 30)
    # Off the picture is meadow (3), except right by water or something in the way at its edge,
    # where standing would put her in the water or the thing.
    meadow = (alpha < 0.1) & ~grow(wet | no, 4)
    cells = np.where(stand & path, 2, np.where(stand, 1, np.where(meadow, 3, 0))).astype(np.uint8)
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
