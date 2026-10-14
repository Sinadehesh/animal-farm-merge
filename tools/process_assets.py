"""Cut a sprite sheet of game assets into separate transparent PNGs.

Usage:
    python tools/process_assets.py <image_path> <output_dir> <cols> <rows> <target_size> [padding_pct]
    python tools/process_assets.py <image_path> <output_dir> auto <target_size> [padding_pct]

Example (a 4x3 sheet of 12 merge items, saved as 00.png ... 11.png at 256px):
    python tools/process_assets.py assets/raw/barn_sheet_v2.jpg out 4 3 256

For a single image, use 1 1 as cols and rows. For a sheet whose rows don't
line up in a grid (2 items, then 4, then 3...), use `auto`: every item is found
wherever it is and numbered row by row, left to right.

How it works:
  1. The background (white, or a light grey or tinted backdrop) is found by
     flood-filling pixels close to it from the edges of the sheet, so white parts *inside* an outlined item (a white
     chicken, the shine on an egg) are kept.
  2. Pale anti-aliased edge pixels are made semi-transparent and their white
     tint is removed, so there is no light fringe on dark boards.
  3. Each separate shape on the sheet belongs to the grid cell its centre falls
     in. Items that poke over a cell line (an ear, a tail) stay whole, and
     sparkles stay with their item, instead of being cut by a fixed grid.
  4. Each item is cropped, centred in a square with padding, and resized.

Needs only Pillow and NumPy.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

BG_TOLERANCE = 40     # how far from pure white still counts as background
GREY_TOLERANCE = 22   # on a grey or tinted backdrop (pale items are closer to it, so tighter)
EDGE_DARKNESS = 90    # edge pixels at least this much darker than white stay fully opaque
MIN_SHAPE_PIXELS = 30 # smaller specks are treated as noise and dropped
ALPHA_FLOOR = 12      # on transparent sheets, pixels fainter than this count as background
ITEM_SHARE = 0.12     # in auto mode, shapes this share of the biggest one or more are items;
                      # smaller ones (sparkles, hearts) join the nearest item
SOLID_ALPHA = 128     # in auto mode, items are found by their solid pixels, so a soft glow
EDGE_GROW = 6         # can't join two items; then this many pixels of soft edge are added back


def flood_from_edges(candidate):
    """Pixels of `candidate` connected to the image border (4-connectivity)."""
    h, w = candidate.shape
    filled = np.zeros_like(candidate)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if candidate[y, x] and not filled[y, x]:
                filled[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if candidate[y, x] and not filled[y, x]:
                filled[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not filled[ny, nx]:
                filled[ny, nx] = True
                queue.append((ny, nx))
    return filled


def label_shapes(mask):
    """Label 8-connected shapes in `mask`. Returns (labels, count)."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    count = 0
    for sy, sx in zip(*np.nonzero(mask)):
        if labels[sy, sx]:
            continue
        count += 1
        labels[sy, sx] = count
        queue = deque([(sy, sx)])
        while queue:
            y, x = queue.popleft()
            for ny in (y - 1, y, y + 1):
                for nx in (x - 1, x, x + 1):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = count
                        queue.append((ny, nx))
    return labels, count


def background_colour(rgb):
    """The sheet's background at every pixel: a smooth plane fitted to the
    border pixels, so plain white, light grey and gently shaded backdrops all work."""
    h, w = rgb.shape[:2]
    ys = np.r_[np.zeros(w), np.full(w, h - 1), np.arange(h), np.arange(h)].astype(int)
    xs = np.r_[np.arange(w), np.arange(w), np.zeros(h), np.full(h, w - 1)].astype(int)
    border = rgb[ys, xs]
    # Ignore border pixels far from the typical one (an item touching the edge).
    keep = np.abs(border - np.median(border, axis=0)).max(axis=1) < 30
    A = np.c_[np.ones(keep.sum()), xs[keep] / w, ys[keep] / h]
    coef, *_ = np.linalg.lstsq(A, border[keep], rcond=None)
    gy, gx = np.mgrid[0:h, 0:w]
    return np.clip(coef[0] + (gx / w)[..., None] * coef[1] + (gy / h)[..., None] * coef[2], 0, 255)


def remove_background(rgb):
    """Return an RGBA array with the light background removed and edges cleaned."""
    rgb = rgb.astype(np.float32)
    bg = background_colour(rgb)
    distance = np.abs(rgb - bg).max(axis=2)
    white = bg.min() > 255 - BG_TOLERANCE / 2
    near_bg = distance < (BG_TOLERANCE if white else GREY_TOLERANCE)
    background = flood_from_edges(near_bg)
    alpha = np.where(background, 0.0, 1.0)

    # Edge band: opaque pixels touching the background (2px deep).
    grown = background.copy()
    for _ in range(2):
        shifted = grown.copy()
        shifted[1:, :] |= grown[:-1, :]
        shifted[:-1, :] |= grown[1:, :]
        shifted[:, 1:] |= grown[:, :-1]
        shifted[:, :-1] |= grown[:, 1:]
        grown = shifted
    band = grown & ~background

    # In the band, pixels close to the background are a mix of the item and the
    # backdrop: make them partly transparent and take the backdrop out of their colour.
    edge_alpha = np.clip(distance / EDGE_DARKNESS, 0, 1)
    alpha = np.where(band, edge_alpha, alpha)
    safe = np.maximum(alpha, 1e-3)[..., None]
    cleaned = np.clip((rgb - (1 - alpha[..., None]) * bg) / safe, 0, 255)
    rgb = np.where(band[..., None], cleaned, rgb)

    return np.dstack([rgb, alpha * 255]).astype(np.uint8)


def load_rgba(image_path):
    """The sheet as RGBA: its own transparency if it has any (some AI tools
    export transparent PNGs), otherwise with the white background removed."""
    img = Image.open(image_path)
    if img.mode in ('RGBA', 'LA', 'PA') or 'transparency' in img.info:
        rgba = np.array(img.convert('RGBA'))
        if (rgba[:, :, 3] < 255).any():
            rgba[rgba[:, :, 3] < ALPHA_FLOOR] = 0  # drop faint haze so items stay separate
            return rgba
    return remove_background(np.array(img.convert('RGB')))


def grid_groups(labels, count, w, h, cols, rows):
    """The shapes in each grid cell, in reading order: each shape belongs to
    the cell its centre falls in."""
    cell_w, cell_h = w / cols, h / rows
    owner = {}
    for shape_id in range(1, count + 1):
        ys, xs = np.nonzero(labels == shape_id)
        if len(ys) < MIN_SHAPE_PIXELS:
            continue
        col = min(int(xs.mean() // cell_w), cols - 1)
        row = min(int(ys.mean() // cell_h), rows - 1)
        owner.setdefault(row * cols + col, []).append((shape_id, len(ys), (ys.min(), ys.max(), xs.min(), xs.max())))
    return [stray_specks_dropped(owner[idx], cell_w) if idx in owner else None for idx in range(cols * rows)]


def stray_specks_dropped(shapes, cell_w):
    """A cell's shapes without tiny specks floating well away from its item
    (a lone sparkle would otherwise stretch the crop and shrink the item)."""
    y0, y1, x0, x1 = max(shapes, key=lambda s: s[1])[2]
    biggest = max(s[1] for s in shapes)
    far = cell_w * 0.06

    def keep(s):
        sy0, sy1, sx0, sx1 = s[2]
        gap = max(y0 - sy1, sy0 - y1, x0 - sx1, sx0 - x1, 0)
        return s[1] >= biggest * 0.02 or gap <= far
    return [s[0] for s in shapes if keep(s)]


def auto_groups(labels, count):
    """Items wherever they are on the sheet. Big shapes are items; small ones
    join the item they are nearest to. Numbered row by row, left to right."""
    shapes = []
    for shape_id in range(1, count + 1):
        ys, xs = np.nonzero(labels == shape_id)
        if len(ys) >= MIN_SHAPE_PIXELS:
            shapes.append({'id': shape_id, 'area': len(ys), 'box': (ys.min(), ys.max(), xs.min(), xs.max()),
                           'cy': ys.mean(), 'cx': xs.mean()})
    if not shapes:
        return []
    biggest = max(s['area'] for s in shapes)
    items = [s for s in shapes if s['area'] >= biggest * ITEM_SHARE]
    for s in items:
        s['members'] = [s['id']]

    def gap(s, item):  # distance from a small shape's centre to an item's box
        y0, y1, x0, x1 = item['box']
        dy = max(y0 - s['cy'], 0, s['cy'] - y1)
        dx = max(x0 - s['cx'], 0, s['cx'] - x1)
        return dx * dx + dy * dy

    for s in shapes:
        if s not in items:
            min(items, key=lambda item: gap(s, item))['members'].append(s['id'])

    # Rows: items whose centres sit within half a typical item height of each other.
    height = float(np.median([s['box'][1] - s['box'][0] for s in items]))
    rows, current = [], []
    for s in sorted(items, key=lambda s: s['cy']):
        if current and s['cy'] - np.mean([c['cy'] for c in current]) > height / 2:
            rows.append(current)
            current = []
        current.append(s)
    rows.append(current)
    return [s['members'] for row in rows for s in sorted(row, key=lambda s: s['cx'])]


def grow(mask, steps):
    """`mask` widened by `steps` pixels."""
    for _ in range(steps):
        wider = mask.copy()
        wider[1:, :] |= mask[:-1, :]
        wider[:-1, :] |= mask[1:, :]
        wider[:, 1:] |= mask[:, :-1]
        wider[:, :-1] |= mask[:, 1:]
        mask = wider
    return mask


def process_sheet(image_path, output_dir, cols, rows, target_size, padding_pct=0.08):
    """Cut a sheet into items; cols = 'auto' finds them wherever they are."""
    os.makedirs(output_dir, exist_ok=True)
    rgba = load_rgba(image_path)
    h, w = rgba.shape[:2]
    auto = cols == 'auto'
    labels, count = label_shapes(rgba[:, :, 3] >= SOLID_ALPHA if auto else rgba[:, :, 3] > 0)
    groups = auto_groups(labels, count) if auto else grid_groups(labels, count, w, h, cols, rows)

    for idx, shape_ids in enumerate(groups):
        out_path = os.path.join(output_dir, f"{idx:02d}.png")
        if not shape_ids:
            Image.new('RGBA', (target_size, target_size)).save(out_path)
            print(f"Saved {out_path} (empty cell)")
            continue

        mine = np.isin(labels, shape_ids)
        if auto:  # add back the soft edge, but never another item's pixels
            others = (labels > 0) & ~mine
            mine = grow(mine, EDGE_GROW) & (rgba[:, :, 3] > 0) & ~others
        ys, xs = np.nonzero(mine)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        item = rgba[y0:y1, x0:x1].copy()
        item[~mine[y0:y1, x0:x1]] = 0  # drop bits of neighbouring items

        bh, bw = item.shape[:2]
        side = int(max(bw, bh) * (1 + 2 * padding_pct))
        square = Image.new('RGBA', (side, side))
        square.paste(Image.fromarray(item, 'RGBA'), ((side - bw) // 2, (side - bh) // 2))
        # Resize in premultiplied alpha so edges don't pick up dark or light halos.
        final = square.convert('RGBa').resize((target_size, target_size), Image.LANCZOS).convert('RGBA')
        final.save(out_path, optimize=True)
        print(f"Saved {out_path}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) >= 4 and args[2] == 'auto':
        process_sheet(args[0], args[1], 'auto', None, int(args[3]), float(args[4]) if len(args) > 4 else 0.08)
    elif len(args) >= 5:
        process_sheet(args[0], args[1], int(args[2]), int(args[3]), int(args[4]), float(args[5]) if len(args) > 5 else 0.08)
    else:
        print("Usage: python process_assets.py <image_path> <output_dir> <cols> <rows> <target_size> [padding_pct]")
        print("       python process_assets.py <image_path> <output_dir> auto <target_size> [padding_pct]")
        sys.exit(1)
