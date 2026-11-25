"""Cleans what a cut-out picture still carries of its old paper: the pale shadow under
it, a pale halo round it, pastel bits of a backdrop. On a cream board tile those hardly
show; anywhere else (an ad, a dark card, over a crate while dragging) they look like a
badly cut picture.

    python3 tools/cleancut.py <in.png> <out.png> [pale_min pale_sat]
    python3 tools/cleancut.py --all <in_dir> <out_dir>      every picture under in_dir; prints what changed

How it works, on the picture as it looked on its white sheet:
  1. A pixel is "pale" if it is light in every channel and hardly coloured: paper, a
     soft shadow, a faint glow. An item's outline and its colours are not.
  2. From the picture's border the pale ground is flooded, but only through openings a
     few pixels wide (GUARD), so a small break in an outline doesn't let the flood into
     a pale item (a white hen, a swan, flour). What is flooded is then grown back a
     little, up to the outline.
  3. Everything flooded goes clear. The pixels left along the new edge get the same
     treatment the cutter gives an edge: paper taken out of their colour, part clear.
White parts shut inside an outline are never reached, so they stay.

Check every result by eye (tools/make_contact_sheet.py, or a sheet on a dark colour):
a pale item with no outline at all can lose part of itself. For those, pass a higher
pale_min (lighter pixels only) or leave the picture as it is.

Needs only Pillow and NumPy.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

PALE_MIN = 168    # on white: every channel at least this...
PALE_SAT = 0.30   # ...and (max - min) / max at most this
GUARD = 3         # the flood passes only where the pale ground is 2 * GUARD + 1 pixels wide
BACK = 5          # and is grown back this many pixels, within the pale ground
EDGE_DARKNESS = 90  # along the new edge: this much darker than white is fully solid


def on_white(a):
    """The picture as it was on white paper: float RGB."""
    alpha = a[..., 3:4].astype(np.float32) / 255
    return a[..., :3].astype(np.float32) * alpha + 255 * (1 - alpha)


def shrink(mask, r):
    return np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * r + 1))) > 127


def grow(mask, r=1):
    return np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * r + 1))) > 127


def flood_from_border(passable):
    """The part of `passable` joined to the picture's border (4 ways)."""
    h, w = passable.shape
    seen = np.zeros_like(passable)
    todo = deque()
    for x in range(w):
        for y in (0, h - 1):
            if passable[y, x] and not seen[y, x]:
                seen[y, x] = True
                todo.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if passable[y, x] and not seen[y, x]:
                seen[y, x] = True
                todo.append((y, x))
    while todo:
        y, x = todo.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and passable[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                todo.append((ny, nx))
    return seen


def clean(img, pale_min=PALE_MIN, pale_sat=PALE_SAT):
    """Returns (cleaned RGBA image, share of the picture's solid area taken away)."""
    a = np.asarray(img.convert('RGBA')).copy()
    white = on_white(a)
    low, high = white.min(axis=2), white.max(axis=2)
    pale = (low >= pale_min) & ((high - low) / np.maximum(high, 1) <= pale_sat)
    # A margin of paper round the picture, so a picture that touches its edge still has an outside.
    pad = GUARD + 2
    padded = np.pad(pale, pad, constant_values=True)
    outside = flood_from_border(shrink(padded, GUARD))
    for _ in range(BACK + GUARD):
        outside = grow(outside) & padded
    outside = outside[pad:-pad, pad:-pad]

    alpha = a[..., 3].astype(np.float32) / 255
    new_alpha = np.where(outside, 0.0, alpha)
    # Along the new edge (two pixels deep): paper out of the colour, part clear.
    band = grow(outside, 2) & ~outside & (alpha > 0)
    distance = 255 - low
    edge_alpha = np.clip(distance / EDGE_DARKNESS, 0, 1)
    new_alpha = np.where(band, np.minimum(alpha, edge_alpha), new_alpha)
    safe = np.maximum(np.where(band, edge_alpha, 1.0), 1e-3)[..., None]
    rgb = np.where(band[..., None], np.clip(255 + (white - 255) / safe, 0, 255), a[..., :3].astype(np.float32))
    out = np.dstack([rgb, new_alpha * 255]).round().astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    before = float(alpha.sum())
    return Image.fromarray(out, 'RGBA'), (before - float(new_alpha.sum())) / max(before, 1.0)


def main():
    if sys.argv[1] == '--all':
        src, dst = sys.argv[2], sys.argv[3]
        for root, _, names in os.walk(src):
            for name in sorted(names):
                if not name.lower().endswith(('.png', '.webp')):
                    continue
                path = os.path.join(root, name)
                img, gone = clean(Image.open(path))
                if gone < 0.004:
                    continue
                out = os.path.join(dst, os.path.relpath(path, src))
                os.makedirs(os.path.dirname(out), exist_ok=True)
                img.save(out)
                print(f'{gone * 100:5.1f}%  {path}')
        return
    args = [float(v) for v in sys.argv[3:5]]
    img, gone = clean(Image.open(sys.argv[1]), *args)
    img.save(sys.argv[2])
    print(f'{gone * 100:.1f}% taken away  {sys.argv[2]}')


if __name__ == '__main__':
    main()
