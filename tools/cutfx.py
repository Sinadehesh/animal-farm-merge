"""Cut the sparkle layer's pictures from a sheet of light drawn on black.

Usage:
    python tools/cutfx.py <sheet.jpg> <out_dir>

The sheet is a grid of 4 x 2 cells split by thin white lines, in this order:
sparkle, glow, rays, ring / shine, dust, swirl, stars. Each cell is cropped
inside its lines, and its black becomes see-through: the alpha is the
brightness (max of r, g, b, with a small floor so JPEG noise in the black goes),
and the colour is divided by it, so a picture looks the same drawn normally or
added on as light. The shine's streak is turned to lie flat (the game turns it
as it likes). Each is trimmed to what's drawn and saved as <out_dir>/<name>.webp,
at most 512 px (the glow 256: it has no detail).
"""
import sys

import numpy as np
from PIL import Image

NAMES = [['sparkle', 'glow', 'rays', 'ring'], ['shine', 'dust', 'swirl', 'stars']]
FLOOR = 14 / 255  # brightness under this is black
INSET = 12  # px kept clear of the white lines


def lines(bright, axis, count):
    """Where the white lines run: the rows or columns that are nearly all white."""
    share = bright.mean(axis=axis)
    hits = np.nonzero(share > 0.6)[0]
    groups = np.split(hits, np.nonzero(np.diff(hits) > 1)[0] + 1) if len(hits) else []
    found = [(g[0], g[-1]) for g in groups if len(g)]
    if len(found) != count:
        raise SystemExit(f'expected {count} lines, found {found}')
    return found


def flatten(img):
    """Turn a streak so its long side lies flat."""
    a = np.asarray(img)[..., 3].astype(float)
    ys, xs = np.nonzero(a > 20)
    w = a[ys, xs]
    x0, y0 = np.average(xs, weights=w), np.average(ys, weights=w)
    cov = np.cov(np.vstack([xs - x0, ys - y0]), aweights=w)
    vx, vy = np.linalg.eigh(cov)[1][:, -1]
    return img.rotate(np.degrees(np.arctan2(vy, vx)), resample=Image.BICUBIC, expand=True)


def cut(sheet, out):
    px = np.asarray(Image.open(sheet).convert('RGB')).astype(float) / 255
    bright = px.min(-1) > 0.75
    cols = [0] + [x for line in lines(bright, 0, 3) for x in line] + [px.shape[1] - 1]
    rows = [0] + [y for line in lines(bright, 1, 1) for y in line] + [px.shape[0] - 1]
    for r, row in enumerate(NAMES):
        for c, name in enumerate(row):
            x0, x1, y0, y1 = cols[2 * c] + INSET, cols[2 * c + 1] - INSET, rows[2 * r] + INSET, rows[2 * r + 1] - INSET
            cell = px[y0:y1, x0:x1]
            value = cell.max(-1)
            alpha = np.clip((value - FLOOR) / (1 - FLOOR), 0, 1)
            colour = cell / np.maximum(value, 1e-3)[..., None]
            rgba = np.dstack([colour, alpha]) * 255
            img = Image.fromarray(rgba.round().astype(np.uint8), 'RGBA')
            if name == 'shine':
                img = flatten(img)
            box = Image.fromarray((np.asarray(img)[..., 3] > 3).astype(np.uint8) * 255).getbbox()
            img = img.crop((max(0, box[0] - 4), max(0, box[1] - 4), min(img.width, box[2] + 4), min(img.height, box[3] + 4)))
            cap = 256 if name == 'glow' else 512
            if max(img.size) > cap:
                k = cap / max(img.size)
                img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
            img.save(f'{out}/{name}.webp', quality=90, alpha_quality=95, method=6)
            print(f'{out}/{name}.webp', img.size)


if __name__ == '__main__':
    cut(sys.argv[1], sys.argv[2])
