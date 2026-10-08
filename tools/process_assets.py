#!/usr/bin/env python3
"""Turn raw AI-generated images into game-ready sprites.

AI image tools usually give you a square JPG on a white or flat-colour
background. This script:
  1. removes the background by flood-filling from the image border
     (works when the prompt asked for a plain, solid background),
  2. trims empty space and pads the subject into a centred square,
  3. resizes and saves a transparent PNG.

Usage:
  python3 tools/process_assets.py RAW_IMAGE OUT_PNG [--size 256] [--tolerance 40]

Example:
  python3 tools/process_assets.py raw/chick_v3.jpg assets/items/barn/02_chick.png
"""
import argparse
from collections import deque

from PIL import Image, ImageFilter


def remove_background(img, tolerance):
    """Make every pixel connected to the border that is close to the border colour transparent."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    # Background colour = median of the border pixels.
    border = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)]
    border += [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    bg = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))

    def close(c):
        return abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) <= tolerance

    mask = Image.new("L", (w, h), 255)
    m = mask.load()
    queue = deque()
    for x in range(w):
        queue.extend([(x, 0), (x, h - 1)])
    for y in range(h):
        queue.extend([(0, y), (w - 1, y)])
    while queue:
        x, y = queue.popleft()
        if m[x, y] == 0 or not close(px[x, y]):
            continue
        m[x, y] = 0
        if x > 0: queue.append((x - 1, y))
        if x < w - 1: queue.append((x + 1, y))
        if y > 0: queue.append((x, y - 1))
        if y < h - 1: queue.append((x, y + 1))

    # Soften the cut edge slightly so it doesn't look jagged.
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1))
    img.putalpha(mask)
    return img


def square_and_resize(img, size, margin=0.04):
    bbox = img.getchannel("A").getbbox()
    if bbox:
        img = img.crop(bbox)
    side = int(max(img.size) * (1 + 2 * margin))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas.resize((size, size), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--size", type=int, default=256, help="output width/height in px (default 256)")
    ap.add_argument("--tolerance", type=int, default=40, help="how far from the background colour still counts as background")
    args = ap.parse_args()

    img = remove_background(Image.open(args.src), args.tolerance)
    square_and_resize(img, args.size).save(args.dst, optimize=True)
    print(f"{args.src} -> {args.dst}")


if __name__ == "__main__":
    main()
