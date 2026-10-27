"""Cuts a person's walk and pictures out of their art sheets (assets/raw/people/).

    python3 tools/cutwalk.py <raw_dir> <out_dir> <Name_Prefix> [frame_height]

From <Name_Prefix>_8_Direction_Walk_Cycle.png (8 rows of 4 frames, 512 px each,
rows S, SW, W, NW, N, NE, E, SE) it writes <out_dir>/walk.webp: the same grid,
every frame cut to one box (so the feet stay on one line) and scaled to
frame_height (256). In each row the frames are turned round so the first is the
one with the feet closest together: it's the one shown while standing.

It also writes body.webp (standing, facing you), side.webp (three quarters, for
dialogs) and face.webp (head and shoulders, square), from the bigger figures on
_Walk_Cardinal.png and _Walk_Diagonal.png when they're there (not on a grid:
each figure is found by itself), else from the walk; and, when there's a
_Character_Reference.png, face.webp from its big portrait (bottom middle).
It prints the walk's frame aspect (width / height) and where the feet are.
"""
import os
import sys

import numpy as np
from PIL import Image

CELL = 512
# Where the big portrait's face is on each reference (middle x, y and the square's side, on a 2048 sheet).
REF_FACE = {'Clara_Everhart': (905, 1400, 640), 'Village_Mayor': (1050, 1360, 640)}
# How much of a figure's height its head and shoulders take (a portrait cut off the body).
HEAD = {'Bram_Goodbarrel': 0.37, 'Mae_Bloombarrow': 0.45, 'Mira_Quayle': 0.3, 'Ellis_Spokewell': 0.3}


def bbox(alpha, cut=40):
    ys, xs = np.nonzero(alpha > cut)
    if not len(xs):
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def figures(img, cut=40):
    """Every figure on a sheet that isn't on a grid: blobs of solid pixels, big ones only, top to bottom, left to right."""
    a = np.array(img.getchannel('A')) > cut
    h, w = a.shape
    seen = np.zeros_like(a, dtype=np.int32)
    out = []
    label = 0
    for y0 in range(0, h, 4):
        for x0 in range(0, w, 4):
            if not a[y0, x0] or seen[y0, x0]:
                continue
            label += 1
            todo = [(y0, x0)]
            seen[y0, x0] = label
            xs, ys = [x0, x0], [y0, y0]
            n = 0
            while todo:
                y, x = todo.pop()
                n += 1
                if x < xs[0]: xs[0] = x
                if x > xs[1]: xs[1] = x
                if y < ys[0]: ys[0] = y
                if y > ys[1]: ys[1] = y
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and a[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = label
                        todo.append((yy, xx))
            if n > 20000:
                out.append((xs[0], ys[0], xs[1] + 1, ys[1] + 1, label))
    # A loose bit (a tool, a strand of hair) joins the figure it overlaps.
    out.sort(key=lambda b: (b[2] - b[0]) * (b[3] - b[1]), reverse=True)
    rows = sorted(out, key=lambda b: (b[1] + b[3]) / 2)
    lines, cur = [], []
    for b in rows:
        if cur and (b[1] + b[3]) / 2 - (cur[0][1] + cur[0][3]) / 2 > 250:
            lines.append(sorted(cur, key=lambda b: b[0]))
            cur = []
        cur.append(b)
    if cur:
        lines.append(sorted(cur, key=lambda b: b[0]))
    return lines, seen


def one_figure(img, lines, seen, row, col, pad=6):
    """A figure off a sheet, on its own (other figures' bits cleared away)."""
    x0, y0, x1, y1, label = lines[row][col]
    sub = np.array(img.convert('RGBA'))[y0:y1, x0:x1].copy()
    mine = seen[y0:y1, x0:x1] == label
    # Keep its soft edge: anything within 3 px of its solid pixels.
    grow = mine.copy()
    for _ in range(3):
        g = grow.copy()
        g[1:] |= grow[:-1]; g[:-1] |= grow[1:]; g[:, 1:] |= grow[:, :-1]; g[:, :-1] |= grow[:, 1:]
        grow = g
    sub[..., 3] = np.where(grow, sub[..., 3], 0)
    out = Image.fromarray(sub)
    canvas = Image.new('RGBA', (out.width + pad * 2, out.height + pad * 2))
    canvas.paste(out, (pad, pad))
    return canvas


def save(img, path, q=86):
    img.save(path, 'WEBP', quality=q, method=6)
    print(f'  {path} {img.size[0]}x{img.size[1]} {os.path.getsize(path) // 1024} KB')


def main():
    raw, out, name = sys.argv[1:4]
    fh = int(sys.argv[4]) if len(sys.argv) > 4 else 256
    os.makedirs(out, exist_ok=True)
    sheet = Image.open(os.path.join(raw, name + '_8_Direction_Walk_Cycle.png')).convert('RGBA')
    alpha = np.array(sheet.getchannel('A'))
    boxes = [[bbox(alpha[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]) for c in range(4)] for r in range(8)]
    x0 = min(b[0] for row in boxes for b in row) - 4
    y0 = min(b[1] for row in boxes for b in row) - 4
    x1 = max(b[2] for row in boxes for b in row) + 4
    y1 = max(b[3] for row in boxes for b in row) + 2
    # Even margins left and right, so she stands in the middle of her frame.
    half = max(CELL // 2 - x0, x1 - CELL // 2)
    x0, x1 = CELL // 2 - half, CELL // 2 + half
    fw = round(fh * (x1 - x0) / (y1 - y0))
    grid = Image.new('RGBA', (fw * 4, fh * 8))
    for r in range(8):
        widths = [b[2] - b[0] for b in boxes[r]]
        first = int(np.argmin(widths))
        for k in range(4):
            c = (first + k) % 4
            frame = sheet.crop((c * CELL + x0, r * CELL + y0, c * CELL + x1, r * CELL + y1)).resize((fw, fh), Image.LANCZOS)
            grid.paste(frame, (k * fw, r * fh))
    save(grid, os.path.join(out, 'walk.webp'), 84)
    print(f'  aspect {fw}/{fh} (the feet are at the foot of the frame)')

    # Bigger figures, if there are sheets of them; else the walk's.
    def big(sheet_name, row, col):
        path = os.path.join(raw, f'{name}_{sheet_name}.png')
        if not os.path.exists(path):
            return None
        img = Image.open(path).convert('RGBA')
        lines, seen = figures(img)
        return one_figure(img, lines, seen, row, col)

    def walk_frame(row):
        c = int(np.argmin([b[2] - b[0] for b in boxes[row]]))
        f = sheet.crop((c * CELL, row * CELL, (c + 1) * CELL, (row + 1) * CELL))
        return f.crop(f.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())

    body = big('Walk_Cardinal', 0, 0) or walk_frame(0)
    side = big('Walk_Diagonal', 3, 0) or walk_frame(1)  # facing down and to the left: towards the words
    for img, file, h in ((body, 'body.webp', 420), (side, 'side.webp', 420)):
        save(img.resize((round(img.width * h / img.height), h), Image.LANCZOS), os.path.join(out, file))

    ref = os.path.join(raw, name + '_Character_Reference.png')
    if os.path.exists(ref) and name in REF_FACE:
        # The reference's big portrait (bottom middle), on its paper, fading out to plain paper
        # towards the edges so nothing next to it shows.
        img = Image.open(ref).convert('RGB')
        k = img.width / 2048
        cx, cy, n = (round(v * k) for v in REF_FACE[name])
        face = img.crop((cx - n // 2, cy - n // 2, cx + n // 2, cy + n // 2)).convert('RGBA')
        paper = Image.new('RGBA', face.size, img.getpixel((8, 8)) + (255,))
        r = np.hypot(*np.meshgrid(np.arange(n) - n / 2, np.arange(n) - n / 2)) / (n / 2)
        mask = Image.fromarray((np.clip((1.02 - r) / 0.14, 0, 1) * 255).astype('uint8'))
        face = Image.composite(face, paper, mask)
    else:
        # Head and shoulders off the body, square.
        hb = body.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        top, h = hb[1], hb[3] - hb[1]
        side_len = int(h * HEAD.get(name, 0.3))
        cols = np.nonzero(np.array(body.getchannel('A'))[top:top + side_len // 2].max(axis=0) > 40)[0]
        cx = int((cols.min() + cols.max()) / 2)
        face = body.crop((cx - side_len // 2, top - side_len // 12, cx + side_len // 2, top - side_len // 12 + side_len))
    save(face.resize((256, 256), Image.LANCZOS), os.path.join(out, 'face.webp'))


if __name__ == '__main__':
    main()
