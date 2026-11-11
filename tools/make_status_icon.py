"""The app's status-bar icon for reminders: the hen as a plain white shape.

Usage:
    python3 tools/make_status_icon.py [preview.png]

Android draws a notification's small icon from its shape alone (every solid
pixel in one colour), so it has to be a white picture on nothing. This takes
the Barn's hen (assets/items/barn/03_hen.png), drops the pale shadow under her
feet, and writes her outline at the five screen densities to
app/android/app/src/main/res/drawable-*/ic_stat_farm.png (24 dp, with the 2 dp
margin Android asks for). capacitor.config.json names it for the
LocalNotifications plugin. With a preview path, it also saves her big and
small on dark and light, to check she still reads as a hen.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

SRC = 'assets/items/barn/03_hen.png'
RES = 'app/android/app/src/main/res'
SIZES = {'mdpi': 24, 'hdpi': 36, 'xhdpi': 48, 'xxhdpi': 72, 'xxxhdpi': 96}
MARGIN = 2 / 24  # of the icon's side, each side


def shape():
    """The hen's solid pixels, without her ground shadow: the biggest connected shape."""
    px = np.asarray(Image.open(SRC).convert('RGBA')).astype(int)
    rgb, alpha = px[..., :3], px[..., 3]
    spread = rgb.max(-1) - rgb.min(-1)
    value = rgb.max(-1)
    h = alpha.shape[0]
    low = np.arange(h)[:, None] > h * 0.72
    shadow = low & (spread < 45) & (value > 100) & (value < 205)  # pale grey-pink, under her feet
    solid = (alpha > 128) & ~shadow
    seen = np.zeros(solid.shape, bool)
    best = []
    for y, x in zip(*np.nonzero(solid)):
        if seen[y, x]:
            continue
        seen[y, x] = True
        todo, part = deque([(y, x)]), []
        while todo:
            a, b = todo.popleft()
            part.append((a, b))
            for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                if 0 <= c < solid.shape[0] and 0 <= d < solid.shape[1] and solid[c, d] and not seen[c, d]:
                    seen[c, d] = True
                    todo.append((c, d))
        if len(part) > len(best):
            best = part
    keep = np.zeros(solid.shape, bool)
    ys, xs = zip(*best)
    keep[list(ys), list(xs)] = True
    mask = Image.fromarray((keep * 255).astype(np.uint8), 'L')
    return mask.crop(mask.getbbox())


def icon(mask, size):
    inner = round(size * (1 - 2 * MARGIN))
    scale = inner / max(mask.size)
    small = mask.resize((max(1, round(mask.width * scale)), max(1, round(mask.height * scale))), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    white = Image.new('RGBA', small.size, (255, 255, 255, 255))
    white.putalpha(small)
    out.paste(white, ((size - small.width) // 2, (size - small.height) // 2), white)
    return out


def main():
    mask = shape()
    for density, size in SIZES.items():
        folder = os.path.join(RES, f'drawable-{density}')
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, 'ic_stat_farm.png')
        icon(mask, size).save(path, optimize=True)
        print(f'  {path} {size}x{size}')
    if len(sys.argv) > 1:
        sheet = Image.new('RGB', (420, 140), (32, 34, 40))
        sheet.paste((240, 240, 240), (210, 0, 420, 140))
        for x0, tint in ((0, (255, 255, 255)), (210, (60, 60, 60))):
            for size, x in ((96, 12), (48, 124), (24, 180)):
                pic = icon(mask, size)
                colour = Image.new('RGBA', pic.size, tint + (255,))
                colour.putalpha(pic.getchannel('A'))
                sheet.paste(colour, (x0 + x, (140 - size) // 2), colour)
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
