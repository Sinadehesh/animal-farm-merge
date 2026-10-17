"""Cut the UI kit sheet (assets/raw/ui/kit.jpg: a 5 x 4 grid of buttons, bars,
badges, panels and icons on flat magenta) into separate pictures in
assets/ui/kit/, and make the few pieces the sheet doesn't have.

Usage:
    python tools/cutkit.py [preview.png]

The background goes by its colour, with soft edges, and the magenta mixed into
the rims is taken back out. The pieces are found as blobs and named in reading
order (NAMES). Made from them:
    bar_plain     the currency bar without its plus button
    plus          that plus button on its own
    square_blue   the big square button frame in the blue of the blue button
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

SRC, OUT = 'assets/raw/ui/kit.jpg', 'assets/ui/kit'
NAMES = [
    'btn_green', 'btn_blue', 'btn_orange', 'btn_grey', 'icon_energy',
    'btn_close', 'ring_blue', 'square_green', 'badge_tick', 'icon_coin',
    'bar_currency', 'progress', 'badge_alert', 'icon_gem',
    'panel', 'ribbon', 'bubble', 'slot', 'icon_star',
]
LOW, HIGH = 22, 70  # colour distance from the background: see-through below LOW, solid above HIGH


def key(rgb):
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, 0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    alpha = np.clip((dist - LOW) / (HIGH - LOW), 0, 1)
    # A rim pixel is part background: take that part back out of its colour.
    fg = np.clip(bg + (rgb - bg) / np.maximum(alpha, 0.2)[..., None], 0, 255)
    # What is left magenta is a soft shadow on the backdrop: make it a plain dark one.
    hue = np.asarray(Image.fromarray(fg.astype(np.uint8)).convert('HSV')).astype(float)
    shadow = (hue[..., 0] > 195) & (hue[..., 0] < 242) & (hue[..., 1] > 60)
    fg[shadow] = (52, 34, 36)
    return fg, alpha


def blobs(solid, step=4):
    """Bounding boxes of the solid blobs, found on a coarse grid."""
    small = solid[::step, ::step]
    seen = np.zeros(small.shape, bool)
    h, w = small.shape
    boxes = []
    for y, x in zip(*np.nonzero(small)):
        if seen[y, x]:
            continue
        q, ys, xs = deque([(y, x)]), [], []
        seen[y, x] = True
        while q:
            a, b = q.popleft()
            ys.append(a)
            xs.append(b)
            for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                if 0 <= c < h and 0 <= d < w and small[c, d] and not seen[c, d]:
                    seen[c, d] = True
                    q.append((c, d))
        if len(ys) > 40:
            boxes.append((min(ys) * step, min(xs) * step, (max(ys) + 1) * step, (max(xs) + 1) * step))
    return boxes


def reading_order(boxes):
    rows = []
    for b in sorted(boxes, key=lambda b: (b[0] + b[2]) / 2):
        mid = (b[0] + b[2]) / 2
        if rows and abs(mid - rows[-1][0]) < 120:
            rows[-1][1].append(b)
        else:
            rows.append([mid, [b]])
    return [b for _, row in rows for b in sorted(row, key=lambda b: b[1])]


def save(px, name):
    Image.fromarray(np.clip(px, 0, 255).round().astype(np.uint8), 'RGBA').save(f'{OUT}/{name}.webp', lossless=True, method=6)


def trim(px):
    ys, xs = np.nonzero(px[..., 3] > 8)
    return px[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def hsv(px):
    return np.asarray(Image.fromarray(px[..., :3].astype(np.uint8)).convert('HSV')).astype(float)


def main():
    import os
    os.makedirs(OUT, exist_ok=True)
    rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    fg, alpha = key(rgb)
    boxes = reading_order(blobs(alpha > 0.5))
    assert len(boxes) == len(NAMES), f'found {len(boxes)} pieces, expected {len(NAMES)}'
    pieces = {}
    for name, (y0, x0, y1, x1) in zip(NAMES, boxes):
        m = 6
        y0, x0, y1, x1 = max(0, y0 - m), max(0, x0 - m), y1 + m, x1 + m
        px = np.dstack([fg[y0:y1, x0:x1], alpha[y0:y1, x0:x1] * 255])
        pieces[name] = trim(px)

    # The currency bar without its plus button: its left end, mirrored for the right.
    bar = pieces['bar_currency']
    h = bar.shape[0]
    rows = np.nonzero(bar[:, h // 2:h, 3].mean(1) > 128)[0]  # the bar's own height, left of the button
    body = bar[rows.min():rows.max() + 1]
    bh = body.shape[0]
    left = body[:, :int(bar.shape[1] * 0.62)]
    pieces['bar_plain'] = np.concatenate([left, left[:, :bh][:, ::-1]], 1)

    # The round plus button off the end of the currency bar, on its own.
    bh_ = hsv(bar)
    green = (bh_[..., 0] > 50) & (bh_[..., 0] < 110) & (bh_[..., 1] > 90) & (bar[..., 3] > 128)
    ys, xs = np.nonzero(green)
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    r = max(ys.max() - ys.min(), xs.max() - xs.min()) / 2 + 7  # with its dark outline
    y0, x0 = int(max(0, cy - r)), int(max(0, cx - r))
    plus = bar[y0:int(cy + r) + 1, x0:int(cx + r) + 1].copy()
    yy, xx = np.mgrid[0:plus.shape[0], 0:plus.shape[1]]
    edge = np.clip(r - np.hypot(yy + y0 - cy, xx + x0 - cx), 0, 1)
    plus[..., 3] *= edge
    pieces['plus'] = plus

    # A blue square button frame, by turning the green one to the blue button's hue.
    sq = pieces['square_green']
    sh = hsv(sq)
    blue_hue = np.median(hsv(pieces['btn_blue'])[..., 0][pieces['btn_blue'][..., 3] > 200])
    green_hue = np.median(sh[..., 0][(sq[..., 3] > 200) & (sh[..., 1] > 80)])
    turn = (sh[..., 1] > 60) & (np.abs(sh[..., 0] - green_hue) < 30)
    sh[..., 0] = np.where(turn, (sh[..., 0] + blue_hue - green_hue) % 256, sh[..., 0])
    blue = np.asarray(Image.fromarray(sh.astype(np.uint8), 'HSV').convert('RGB')).astype(float)
    pieces['square_blue'] = np.dstack([blue, sq[..., 3]])

    del pieces['progress']  # drawn by CSS instead: the sheet's is too blocky to stretch
    del pieces['bar_currency']  # used as bar_plain and plus
    for name, px in pieces.items():
        save(px, name)
        print(f'{name}: {px.shape[1]}x{px.shape[0]}')

    if len(sys.argv) > 1:  # every piece on a light and a dark backdrop, to check the edges
        tiles = list(pieces.values())
        S = 240
        sheet = Image.new('RGBA', (len(tiles) * (S + 8), 2 * S + 8), (0, 0, 0, 0))
        for k, px in enumerate(tiles):
            im = Image.fromarray(np.clip(px, 0, 255).astype(np.uint8), 'RGBA')
            im.thumbnail((S, S))
            for r, col in enumerate(((236, 228, 210, 255), (40, 52, 40, 255))):
                tile = Image.new('RGBA', (S, S), col)
                tile.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
                sheet.alpha_composite(tile, (k * (S + 8), r * (S + 8)))
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
