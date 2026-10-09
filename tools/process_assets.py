"""Cut a sprite sheet of game assets into separate transparent PNGs.

Usage:
    python tools/process_assets.py <image_path> <output_dir> <cols> <rows> <target_size> [padding_pct]

Example (a 4x3 sheet of 12 merge items, saved as 00.png ... 11.png at 256px):
    python tools/process_assets.py assets/raw/barn_sheet_v2.jpg out 4 3 256

For a single image, use 1 1 as cols and rows.

How it works:
  1. The white background is found by flood-filling near-white pixels from the
     edges of the sheet, so white parts *inside* an outlined item (a white
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
EDGE_DARKNESS = 90    # edge pixels at least this much darker than white stay fully opaque
MIN_SHAPE_PIXELS = 30 # smaller specks are treated as noise and dropped


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


def remove_background(rgb):
    """Return an RGBA array with the white background removed and edges cleaned."""
    rgb = rgb.astype(np.float32)
    near_white = (rgb > 255 - BG_TOLERANCE).all(axis=2)
    background = flood_from_edges(near_white)
    alpha = np.where(background, 0.0, 1.0)

    # Edge band: opaque pixels touching the background (2px deep).
    band = np.zeros_like(background)
    grown = background.copy()
    for _ in range(2):
        shifted = grown.copy()
        shifted[1:, :] |= grown[:-1, :]
        shifted[:-1, :] |= grown[1:, :]
        shifted[:, 1:] |= grown[:, :-1]
        shifted[:, :-1] |= grown[:, 1:]
        grown = shifted
    band = grown & ~background

    # In the band, pale pixels are a mix of the item and the white background:
    # make them partly transparent and take the white out of their colour.
    darkness = 255 - rgb.min(axis=2)
    edge_alpha = np.clip(darkness / EDGE_DARKNESS, 0, 1)
    alpha = np.where(band, edge_alpha, alpha)
    safe = np.maximum(alpha, 1e-3)[..., None]
    cleaned = np.clip((rgb - (1 - alpha[..., None]) * 255) / safe, 0, 255)
    rgb = np.where(band[..., None], cleaned, rgb)

    return np.dstack([rgb, alpha * 255]).astype(np.uint8)


def process_sheet(image_path, output_dir, cols, rows, target_size, padding_pct=0.08):
    os.makedirs(output_dir, exist_ok=True)
    rgba = remove_background(np.array(Image.open(image_path).convert('RGB')))
    h, w = rgba.shape[:2]
    cell_w, cell_h = w / cols, h / rows

    labels, count = label_shapes(rgba[:, :, 3] > 0)

    # Give every shape to the cell its centre falls in.
    owner = {}
    for shape_id in range(1, count + 1):
        ys, xs = np.nonzero(labels == shape_id)
        if len(ys) < MIN_SHAPE_PIXELS:
            continue
        col = min(int(xs.mean() // cell_w), cols - 1)
        row = min(int(ys.mean() // cell_h), rows - 1)
        owner.setdefault(row * cols + col, []).append(shape_id)

    for idx in range(cols * rows):
        out_path = os.path.join(output_dir, f"{idx:02d}.png")
        shape_ids = owner.get(idx)
        if not shape_ids:
            Image.new('RGBA', (target_size, target_size)).save(out_path)
            print(f"Saved {out_path} (empty cell)")
            continue

        mine = np.isin(labels, shape_ids)
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
    if len(sys.argv) < 6:
        print("Usage: python process_assets.py <image_path> <output_dir> <cols> <rows> <target_size> [padding_pct]")
        sys.exit(1)

    process_sheet(
        sys.argv[1],
        sys.argv[2],
        int(sys.argv[3]),
        int(sys.argv[4]),
        int(sys.argv[5]),
        float(sys.argv[6]) if len(sys.argv) > 6 else 0.08,
    )
