"""Cut a townsperson's pose sheet into the game's pose pictures.

Usage:
    python tools/cutposes.py <sheet> <id> [preview.png]

The sheet is 4 x 2 full-body poses on a flat magenta (or green) background, in
this order: stand, wave, talk, cheer / clap, think, point, ask. Writes, under
assets/characters/poses/<id>/:
    <pose>.webp  each pose on one shared frame, all at the sheet's scale, the
                 body's middle at the frame's middle and the feet `feet` px
                 above its bottom (so swapping poses never shifts them)
    body.webp    standing, in a square, as the old single pictures were
    face.webp    head and shoulders, for the round portraits
    hello.webp   the wave from the waist up (calling you over, story scenes)
and prints the `frame` line for assets.js. With a preview path, saves the poses
on a light and a dark strip, to check the cut by eye.

Only the background touching the sheet's edge (and enclosed gaps of the exact
same colour) is removed, so pink clothes and flowers stay.
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

POSES = ['stand', 'wave', 'talk', 'cheer', 'clap', 'think', 'point', 'ask']


def flood(mask, seeds):
    """The cells of `mask` reachable from `seeds`."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    q = deque((y, x) for y, x in seeds if mask[y, x])
    for y, x in q:
        seen[y, x] = True
    while q:
        y, x = q.popleft()
        for a, b in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= a < h and 0 <= b < w and mask[a, b] and not seen[a, b]:
                seen[a, b] = True
                q.append((a, b))
    return seen


def spread(rgb, known, n):
    """`rgb` with the pixels next to `known` ones given their colour, n rings out."""
    c = np.where(known[..., None], rgb, 0.0)
    k = known.astype(float)
    for _ in range(n):
        cp, kp = np.pad(c, ((1, 1), (1, 1), (0, 0))), np.pad(k, 1)
        h, w = k.shape
        s = sum(cp[y:y + h, x:x + w] for y in range(3) for x in range(3))
        cnt = sum(kp[y:y + h, x:x + w] for y in range(3) for x in range(3))
        new = (cnt > 0) & (k == 0)
        c[new] = s[new] / cnt[new][:, None]
        k[new] = 1
    return c


def parts(mask):
    """Each connected patch of `mask`, as (ys, xs) arrays."""
    left = mask.copy()
    out = []
    for y, x in zip(*np.nonzero(mask)):
        if left[y, x]:
            part = flood(left, [(y, x)])
            left &= ~part
            out.append(np.nonzero(part))
    return out


def main():
    sheet, who = sys.argv[1], sys.argv[2]
    preview = sys.argv[3] if len(sys.argv) > 3 else None
    A = np.asarray(Image.open(sheet).convert('RGB')).astype(float)
    H, W, _ = A.shape
    rim = np.concatenate([A[:4].reshape(-1, 3), A[-4:].reshape(-1, 3), A[:, :4].reshape(-1, 3), A[:, -4:].reshape(-1, 3)])
    bg = np.median(rim, 0)
    d = np.sqrt(((A - bg) ** 2).sum(-1))

    # The background: what's near its colour, or its colour in shadow (a
    # narrow gap between an arm and the body), joined to the edge; plus
    # enclosed gaps (an arm on a hip) that are its colour exactly.
    dark = np.array([45.0, 30, 30])  # the outlines
    span = bg - dark
    t = np.clip(((A - dark) @ span) / (span @ span), 0, 1)
    shade = np.sqrt(((A - dark - t[..., None] * span) ** 2).sum(-1))
    edge = [(0, x) for x in range(W)] + [(H - 1, x) for x in range(W)] + [(y, 0) for y in range(H)] + [(y, W - 1) for y in range(H)]
    like = (d < 80) | ((t > 0.45) & (shade < 35))
    back = flood(like, edge)
    for ys, xs in parts(~back & (like | ((t > 0.45) & (shade < 55)))):
        if len(ys) > 25 and (d[ys, xs].mean() < 30 or (t[ys, xs].mean() > 0.55 and shade[ys, xs].mean() < 45)):
            back[ys, xs] = True
            print(f'  gap of {len(ys)} px at {int(xs.mean())},{int(ys.mean())}')
    fg = ~back

    # Each pose: the patches whose middle is in its cell (a basket on the
    # ground beside her is a patch of its own); specks are dropped.
    cells = [np.zeros((H, W), bool) for _ in POSES]
    for ys, xs in parts(fg):
        if len(ys) < 300:
            continue
        k = min(int(xs.mean() * 4 / W), 3) + 4 * min(int(ys.mean() * 2 / H), 1)
        cells[k][ys, xs] = True

    # Soft edges, with the background's tint taken back out of them. The rim
    # is mostly dark outline mixed with background, so how much background is
    # in a rim pixel shows in how strongly it has the background's tint.
    tint = bg - bg.mean()
    strength = np.linalg.norm(tint)
    toward = lambda px: ((px - px.mean(-1, keepdims=True)) @ (tint / strength)) / strength
    mix = np.clip(toward(A), 0, 1)
    cuts = []
    for k, m in enumerate(cells):
        mi = Image.fromarray(m.astype(np.uint8) * 255)
        wide = np.asarray(mi.filter(ImageFilter.MaxFilter(5))) > 0
        core = np.asarray(mi.filter(ImageFilter.MinFilter(5))) > 0
        rimpx = wide & ~core
        a = np.where(rimpx, np.clip((0.85 - mix) / 0.7, 0, 1), m.astype(float))  # a crisp edge, not a halo
        af = np.maximum(a, 1e-3)[..., None]
        rgb = np.where(rimpx[..., None], np.clip((A - (1 - af) * bg) / af, 0, 255), A)
        # Where too much was taken out, the rim turns the opposite colour
        # (green, for magenta): no further that way than the colour inside it.
        floor = np.minimum(toward(spread(A, core, 4)), 0) - 0.05
        over = np.where(rimpx, np.maximum(floor - toward(rgb), 0), 0)
        rgb = np.clip(rgb + over[..., None] * tint, 0, 255)
        m = a > 0
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        cuts.append((np.dstack([rgb, a * 255])[y0:y1, x0:x1].astype(np.uint8), m[y0:y1, x0:x1]))

    # Where each stands: the middle of the body (the median across rows of each
    # row's middle, over the chest and hips, so an arm or a basket can't pull
    # it) and the feet (the lowest point near that middle).
    stand_h = cuts[0][1].shape[0]
    spots = []
    for img, m in cuts:
        h, w = m.shape
        rows = [np.nonzero(m[y])[0] for y in range(max(0, h - int(stand_h * 0.72)), h - int(stand_h * 0.42))]
        mid = float(np.median([np.median(r) for r in rows if len(r)]))
        near = m[:, max(0, int(mid - stand_h * 0.16)):int(mid + stand_h * 0.16)]
        feet = int(np.nonzero(near.any(1))[0].max()) + 1
        spots.append((mid, feet))
    left = max(mid for mid, _ in spots)
    right = max(m.shape[1] - mid for (_, m), (mid, _) in zip(cuts, spots))
    above = max(feet for _, feet in spots)
    below = max(max(m.shape[0] - feet, 0) for (_, m), (_, feet) in zip(cuts, spots))
    half = int(np.ceil(max(left, right))) + 4
    fw, fh, foot = 2 * half, above + below + 8, below + 4

    out = Path(f'assets/characters/poses/{who}')
    out.mkdir(parents=True, exist_ok=True)
    frames = []
    for name, (img, m), (mid, feet) in zip(POSES, cuts, spots):
        frame = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
        frame.alpha_composite(Image.fromarray(img, 'RGBA'), (round(half - mid), fh - foot - feet))
        frame.save(out / f'{name}.webp', quality=92, alpha_quality=95, method=6)
        frames.append(frame)

    # Standing, in a square (where one picture stands in for the person);
    # head and shoulders, for the portraits; the wave from the waist up.
    stand = frames[0]
    side = round(stand_h / 0.92)
    body = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    body.alpha_composite(stand, (side // 2 - half, side - round(side * 0.03) - (fh - foot)))
    body.save(out / 'body.webp', quality=92, alpha_quality=95, method=6)
    top = fh - foot - spots[0][1]
    side = round(stand_h * 0.36)
    face = stand.crop((half - side // 2, top - 4, half + side - side // 2, top - 4 + side))
    face.save(out / 'face.webp', quality=92, alpha_quality=95, method=6)
    wave = frames[1]
    wtop = wave.getbbox()[1]
    side = round(stand_h * 0.6)
    hello = wave.crop((half - side // 2, wtop - 4, half + side - side // 2, wtop - 4 + side))
    hello.save(out / 'hello.webp', quality=92, alpha_quality=95, method=6)

    print(f"frame: [{fw}, {fh}, {stand_h}, {foot}],  // w, h, standing height, feet above the bottom (px)")
    if preview:
        strip = Image.new('RGBA', (fw * 8 + side * 2, fh * 2), (0, 0, 0, 0))
        for row, colour in enumerate([(205, 205, 200, 255), (40, 44, 52, 255)]):
            strip.paste(colour, (0, row * fh, strip.width, (row + 1) * fh))
            for i, f in enumerate(frames):
                strip.alpha_composite(f, (i * fw, row * fh))
            strip.alpha_composite(face.resize((side, side)), (fw * 8, row * fh))
            strip.alpha_composite(hello, (fw * 8 + side, row * fh))
        strip.save(preview)


if __name__ == '__main__':
    main()
