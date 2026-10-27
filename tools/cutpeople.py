"""Cuts each person's pictures for the game out of their art (assets/raw/people/).

    python3 tools/cutpeople.py <raw_dir> <out_dir> <Name_Prefix>

From <Name_Prefix>_Character_Reference.png (a sheet on plain paper: a big figure
on the left, four standing figures turning round along the top, a big portrait
under them) it writes, each cut off its paper:
  stand.webp  the first of the four: standing, facing you (on the map);
  bust.webp   the big figure from the waist up (dialogs and story scenes);
  portrait.webp  head and shoulders off the big portrait, square (tasks, orders, lists).
Without a reference sheet it makes stand-walk.webp and bust-walk.webp, stand-ins
until there is one, from _8_Direction_Walk_Cycle.png (of its frames facing you,
the one with the feet closest together), and no portrait.
It prints the standing figure's aspect (width / height).
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

CELL = 512  # a walk cycle's frame
TOL = 30  # how far from the paper's colour a pixel may be and still be paper
WAIST = 0.47  # where the waist is, down a big figure
# By hand, on a 2048 sheet: where the big portrait's face is (middle x, y and the square's
# side), and the big figure's box where it touches something else.
REF_FACE = {'Clara_Everhart': (905, 1400, 640), 'Village_Mayor': (1050, 1360, 640), 'Ellis_Spokewell': (942, 1410, 700),
            'Mae_Bloombarrow': (1126, 1455, 640), 'Bram_Goodbarrel': (983, 1316, 614), 'Mira_Quayle': (788, 1420, 600)}
BIG = {'Mira_Quayle': (82, 37, 655, 1475)}


def save(img, path, q=86):
    img.save(path, 'WEBP', quality=q, method=6)
    print(f'  {path} {img.size[0]}x{img.size[1]} {os.path.getsize(path) // 1024} KB')


def paper_of(img):
    a = np.array(img.convert('RGB')).astype(int)
    edge = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    return np.median(edge, axis=0)


def figures(img, paper, step=4):
    """The boxes (x0, y0, x1, y1) of the drawings on a sheet, found on every step-th pixel."""
    d = np.abs(np.array(img.convert('RGB')).astype(int)[::step, ::step] - paper).max(axis=2) > TOL - 2
    h, w = d.shape
    seen = np.zeros_like(d)
    out = []
    for y0 in range(h):
        for x0 in range(w):
            if not d[y0, x0] or seen[y0, x0]:
                continue
            seen[y0, x0] = True
            todo, xs, ys, n = deque([(y0, x0)]), [x0, x0], [y0, y0], 0
            while todo:
                y, x = todo.popleft()
                n += 1
                xs[0], xs[1], ys[0], ys[1] = min(xs[0], x), max(xs[1], x), min(ys[0], y), max(ys[1], y)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and d[yy, xx] and not seen[yy, xx]:
                            seen[yy, xx] = True
                            todo.append((yy, xx))
            if n > 400:
                out.append((xs[0] * step, ys[0] * step, xs[1] * step + step, ys[1] * step + step))
    return out


def cut(img, box, paper, pad=8):
    """The drawing in box, off its paper: the paper that reaches the box's edge goes clear,
    and so do pockets of plain paper inside it (between an arm and the body)."""
    x0, y0, x1, y1 = max(0, box[0] - pad), max(0, box[1] - pad), min(img.width, box[2] + pad), min(img.height, box[3] + pad)
    rgb = np.array(img.crop((x0, y0, x1, y1)).convert('RGB'))
    d = np.abs(rgb.astype(int) - paper).max(axis=2)
    like = d < TOL
    clear = np.zeros_like(like)
    clear[0], clear[-1], clear[:, 0], clear[:, -1] = like[0], like[-1], like[:, 0], like[:, -1]
    while True:
        grow = clear.copy()
        grow[1:] |= clear[:-1]; grow[:-1] |= clear[1:]; grow[:, 1:] |= clear[:, :-1]; grow[:, :-1] |= clear[:, 1:]
        grow &= like
        if (grow == clear).all():
            break
        clear = grow
    # Pockets: big patches of plain paper (very near its colour, all of it) shut in by the
    # drawing; small ones are a light shirt's shine.
    plain = (d < 10) & ~clear
    seen = np.zeros_like(plain)
    h, w = plain.shape
    for y0_, x0_ in zip(*np.nonzero(plain)):
        if seen[y0_, x0_]:
            continue
        seen[y0_, x0_] = True
        todo, blob = deque([(y0_, x0_)]), []
        while todo:
            y, x = todo.popleft()
            blob.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and plain[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    todo.append((yy, xx))
        if len(blob) > 0.002 * h * w:
            ys, xs = zip(*blob)
            clear[list(ys), list(xs)] = True
    alpha = Image.fromarray(np.where(clear, 0, 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = Image.fromarray(rgb).convert('RGBA')
    out.putalpha(alpha)
    return out.crop(out.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())


def bust_of(fig, waist=WAIST):
    """A figure from the waist up, fading out at the waist."""
    h = round(fig.height * waist)
    top = fig.crop((0, 0, fig.width, h))
    a = np.array(top.getchannel('A')).astype(float)
    fade = min(40, h // 10)
    a[h - fade:] *= np.linspace(1, 0, fade)[:, None]
    top.putalpha(Image.fromarray(a.astype('uint8')))
    return top.crop(top.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())


def main():
    raw, out, name = sys.argv[1:4]
    os.makedirs(out, exist_ok=True)
    ref = os.path.join(raw, name + '_Character_Reference.png')
    tag = ''
    if os.path.exists(ref):
        img = Image.open(ref).convert('RGB')
        paper, k = paper_of(img), img.width / 2048
        boxes = figures(img, paper)
        tall = [b for b in boxes if b[3] - b[1] > img.height * 0.4]
        big = tuple(round(v * k) for v in BIG[name]) if name in BIG else min(tall, key=lambda b: b[0])  # the big figure, on the left
        row = sorted((b for b in tall if b[1] < img.height * 0.15 and b[3] < img.height * 0.6), key=lambda b: b[0])
        stand = cut(img, row[0], paper)
        bust = bust_of(cut(img, big, paper))
        # The big portrait (bottom middle), on its paper, fading out to plain paper
        # towards the edges so nothing next to it shows.
        if name in REF_FACE:
            cx, cy, n = (round(v * k) for v in REF_FACE[name])
            n += n % 2
        else:
            pb = max((b for b in boxes if b[1] > img.height * 0.45 and b[0] < img.width * 0.5 < b[2]), key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
            n = 2 * round(320 * k)
            cx, cy = (pb[0] + pb[2]) // 2, pb[1] + n // 2
        face = img.crop((cx - n // 2, cy - n // 2, cx + n // 2, cy + n // 2)).convert('RGBA')
        sheet = Image.new('RGBA', face.size, tuple(int(v) for v in paper) + (255,))
        r = np.hypot(*np.meshgrid(np.arange(n) - n / 2, np.arange(n) - n / 2)) / (n / 2)
        face = Image.composite(face, sheet, Image.fromarray((np.clip((1.02 - r) / 0.14, 0, 1) * 255).astype('uint8')))
        save(face.resize((256, 256), Image.LANCZOS), os.path.join(out, 'portrait.webp'))
    else:
        sheet = Image.open(os.path.join(raw, name + '_8_Direction_Walk_Cycle.png')).convert('RGBA')
        frames = [sheet.crop((c * CELL, 0, (c + 1) * CELL, CELL)) for c in range(4)]
        boxes = [f.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox() for f in frames]
        c = int(np.argmin([b[2] - b[0] for b in boxes]))
        stand = frames[c].crop(boxes[c])
        bust = bust_of(stand)
        tag = '-walk'
    stand = stand.resize((round(stand.width * 420 / stand.height), 420), Image.LANCZOS)
    save(stand, os.path.join(out, f'stand{tag}.webp'))
    if bust.height > 360:
        bust = bust.resize((round(bust.width * 360 / bust.height), 360), Image.LANCZOS)
    save(bust, os.path.join(out, f'bust{tag}.webp'))
    print(f'  aspect {stand.width}/{stand.height}')


if __name__ == '__main__':
    main()
