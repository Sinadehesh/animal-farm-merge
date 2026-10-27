"""Cut a sheet of 8 plot props (4 across, 2 down, on flat magenta) into one
picture each, by name, ready for tools/brighten.py.

Usage:
    python tools/cutprops.py <sheet> <out_dir> <name1> ... <name8>

Names go left to right, top row first (as in the sheet's prompt). The
background goes by its colour (the median of the sheet's border), with soft
edges, and the magenta mixed into the rim is taken back out. The two rows are
split at the emptiest line across the middle, and each row at its three widest
gaps; a shape that crosses a split (a tall bird box) goes whole to the cell its
middle is in. Each prop is cropped to itself with an 8 px margin and made at most
340 px on its longer side, like the other props in assets/map/props/.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

LOW, HIGH = 30, 90  # colour distance from the background: under LOW see-through, over HIGH solid
PAD = 8
LONGEST = 340


def gaps(line):
    """The runs of empty places along a line, as (start, end), widest first."""
    empty = np.concatenate([[False], line == 0, [False]])
    edges = np.flatnonzero(np.diff(empty.astype(int)))
    runs = list(zip(edges[::2], edges[1::2]))
    return sorted(runs, key=lambda r: r[0] - r[1])


def shapes(solid, step=3):
    """Each separate shape on a coarse grid: (its cells' mask on the grid, its middle in px)."""
    small = solid[::step, ::step]
    seen = np.zeros(small.shape, bool)
    h, w = small.shape
    out = []
    for y, x in zip(*np.nonzero(small)):
        if seen[y, x]:
            continue
        seen[y, x] = True
        todo, cells = deque([(y, x)]), []
        while todo:
            a, b = todo.popleft()
            cells.append((a, b))
            for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                if 0 <= c < h and 0 <= d < w and small[c, d] and not seen[c, d]:
                    seen[c, d] = True
                    todo.append((c, d))
        ys, xs = np.array(cells).T
        out.append(((ys, xs), (ys.mean() * step, xs.mean() * step)))
    return out


def main():
    src, out, names = sys.argv[1], sys.argv[2], sys.argv[3:]
    assert len(names) == 8, 'eight names, left to right, top row first'
    os.makedirs(out, exist_ok=True)
    rgb = np.asarray(Image.open(src).convert('RGB')).astype(float)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, 0)
    alpha = np.clip((np.sqrt(((rgb - bg) ** 2).sum(-1)) - LOW) / (HIGH - LOW), 0, 1)
    fg = np.clip(bg + (rgb - bg) / np.maximum(alpha, 0.2)[..., None], 0, 255)
    solid = alpha > 0.5
    h, w = solid.shape
    rows = solid.sum(1)
    mid = int(h * 0.3) + int(np.argmin(rows[int(h * 0.3):int(h * 0.7)]))
    cells = []  # (top, bottom, left, right), left to right, top row first
    for top, bottom in ((0, mid), (mid, h)):
        cols = solid[top:bottom].sum(0)
        inner = [g for g in gaps(cols) if g[0] > 0 and g[1] < w][:3]
        cuts = [0] + sorted((a + b) // 2 for a, b in inner) + [w]
        cells += [(top, bottom, left, right) for left, right in zip(cuts, cuts[1:])]
    step = 3
    owner = np.full(solid[::step, ::step].shape, -1)
    for (ys, xs), (my, mx) in shapes(solid, step):
        k = next(i for i, (t, b, l, r) in enumerate(cells) if t <= my < b and l <= mx < r)
        owner[ys, xs] = k
    # Grown a little, so each shape keeps its soft edge.
    for _ in range(2):
        p = np.pad(owner, 1, constant_values=-1)
        for q in (p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]):
            owner = np.where(owner < 0, q, owner)
    owner = np.repeat(np.repeat(owner, step, 0), step, 1)[:h, :w]
    for k, name in enumerate(names):
        mine = owner == k
        ys, xs = np.nonzero(mine & solid)
        y0, y1 = max(0, ys.min() - PAD), min(h, ys.max() + PAD + 1)
        x0, x1 = max(0, xs.min() - PAD), min(w, xs.max() + PAD + 1)
        px = np.dstack([fg, alpha * mine * 255])[y0:y1, x0:x1].round().astype(np.uint8)
        im = Image.fromarray(px, 'RGBA')
        scale = min(1, LONGEST / max(im.size))
        if scale < 1:
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        path = os.path.join(out, name + '.webp')
        im.save(path, 'WEBP', quality=88, method=6)
        print(f'  {path} {im.width}x{im.height}')


if __name__ == '__main__':
    main()
