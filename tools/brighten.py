"""Brighten a map picture (plots, their props, scenery, the ground) to the
game's look, and clean the magenta left on its rim by the background it was
cut from.

Usage:
    python tools/brighten.py <in> <out> [<in> <out> ...]

The colours get a vibrance lift (dull colours more than bright ones, so reds
don't burn out), a little more contrast and lighter mid-tones. On a picture with
see-through parts, the pixels near its edge lose any magenta tint (pink or
purple fringes); lavender, tulips and other colours inside the picture are left
alone. Run it on the picture as cut, once: running it twice brightens twice.
"""
import sys

import numpy as np
from PIL import Image

VIBRANCE = 0.45  # how much a grey-ish colour gains saturation (a vivid one gains little)
CONTRAST = 1.06
GAMMA = 0.94  # under 1 lifts the mid-tones
RIM = 14  # px from the see-through edge where the magenta is cleaned (cut-outs keep a wide pink halo)


def grow(m, n):
    for _ in range(n):
        p = np.pad(m, 1)
        m = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return m


def despill(rgb, alpha):
    """Take the magenta out of the pixels on the picture's rim."""
    rim = grow(alpha < 128, RIM)  # see-through pixels too: scaling blends their colour in
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    spill = np.minimum(r, b) - g
    hue = np.asarray(Image.fromarray(rgb.astype(np.uint8)).convert('HSV'))[..., 0].astype(float) * 360 / 255
    pinkish = (hue >= 280) | (hue <= 10)  # lavender (about 265) stays purple
    fix = rim & pinkish & (spill > 0)
    rgb[..., 0] = np.where(fix, r - spill, r)
    rgb[..., 2] = np.where(fix, b - spill, b)
    return rgb


def grade(rgb):
    x = rgb / 255
    grey = x.mean(-1, keepdims=True)
    sat = x.max(-1, keepdims=True) - x.min(-1, keepdims=True)
    x = grey + (x - grey) * (1 + VIBRANCE * (1 - sat))
    x = (x - 0.5) * CONTRAST + 0.5
    x = np.clip(x, 0, 1) ** GAMMA
    return x * 255


def ungrade(rgb):
    """Roughly undo grade(), for tools that judge the colours as drawn (walkmask.py)."""
    x = (np.clip(rgb / 255, 0, 1) ** (1 / GAMMA) - 0.5) / CONTRAST + 0.5
    grey = x.mean(-1, keepdims=True)
    sat = x.max(-1, keepdims=True) - x.min(-1, keepdims=True)
    was = ((1 + VIBRANCE) - np.sqrt((1 + VIBRANCE) ** 2 - 4 * VIBRANCE * np.clip(sat, 0, 1))) / (2 * VIBRANCE)
    x = grey + (x - grey) / (1 + VIBRANCE * (1 - was))
    return np.clip(x, 0, 1) * 255


def brighten(src, out):
    im = Image.open(src).convert('RGBA')
    px = np.asarray(im).astype(float)
    rgb, alpha = px[..., :3], px[..., 3]
    if (alpha < 250).any():
        rgb = despill(rgb, alpha)
    px[..., :3] = grade(rgb)
    pic = Image.fromarray(np.clip(px, 0, 255).round().astype(np.uint8), 'RGBA')
    if (alpha >= 250).all():
        pic = pic.convert('RGB')
    pic.save(out, quality=88, alpha_quality=95, method=6)


if __name__ == '__main__':
    args = sys.argv[1:]
    for src, out in zip(args[::2], args[1::2]):
        brighten(src, out)
        print(out)
