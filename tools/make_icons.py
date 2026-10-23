# Makes every app icon from the icon art (the farm girl in the roses, eyes scratched out).
#   python3 tools/make_icons.py assets/raw/icon_rose_girl.jpg <out_dir>
# then copy <out_dir>/app-icon-rose-*.png and apple-touch-icon-rose.png to assets/ui/ (new file names if the
# picture changes), <out_dir>/res/mipmap-*/ to app/android/app/src/main/res/ and play-icon-512.png to app/store/.
import sys, os
import numpy as np
from PIL import Image, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
H, W = im.shape[:2]
P = 400  # padding on every side, so crops can reach past the picture's edges

# Past the head crop the picture fades into the night, so icon margins (shown only by some masks
# and launcher animations) are dark instead of a stretched or mirrored copy of the art.
DARK = np.array([18, 8, 16], np.float32)
big = np.empty((H + 2 * P, W + 2 * P, 3), np.float32)
big[:] = DARK
big[P:P + H, P:P + W] = im

CX, CY, HEAD = 1000, 720, 1400   # the head crop: hat, scratched-out eyes, smile, scarf


def crop(size_src, out_px, vignette=True):
    x0, y0 = CX - size_src / 2 + P, CY - size_src / 2 + P
    box = (int(round(x0)), int(round(y0)), int(round(x0 + size_src)), int(round(y0 + size_src)))
    img = Image.fromarray(np.clip(big, 0, 255).astype(np.uint8)).crop(box)
    a = np.asarray(img).astype(np.float32)
    if vignette:
        n = a.shape[0]
        yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
        # distance measured against the head crop, so every size darkens the same way around the face
        r = np.hypot(xx - n / 2, yy - n / 2) / (HEAD / 2 * n / size_src)
        t = np.clip((r - 0.62) / (1.25 - 0.62), 0, 1)
        f = 1 - 0.42 * (t * t * (3 - 2 * t))
        # outside the head crop square: fade to dark
        d = np.maximum(abs(xx - n / 2), abs(yy - n / 2)) / (HEAD / 2 * n / size_src)
        u = np.clip((d - 0.98) / (1.08 - 0.98), 0, 1)
        g = u * u * (3 - 2 * u)
        a = (a * f[..., None]) * (1 - g[..., None]) + DARK * g[..., None]
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return img.resize((out_px, out_px), Image.LANCZOS)


def rounded(img, radius_frac):
    n = img.size[0] * 4
    m = Image.new('L', (n, n), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * radius_frac), fill=255)
    out = img.convert('RGBA'); out.putalpha(m.resize(img.size, Image.LANCZOS)); return out


def circle(img):
    n = img.size[0] * 4
    m = Image.new('L', (n, n), 0)
    ImageDraw.Draw(m).ellipse((0, 0, n - 1, n - 1), fill=255)
    out = img.convert('RGBA'); out.putalpha(m.resize(img.size, Image.LANCZOS)); return out


# Google Play: 512 square, full bleed (Play rounds the corners itself).
crop(HEAD, 512).save(f'{OUT}/play-icon-512.png', optimize=True)
crop(HEAD, 1024).save(f'{OUT}/icon-1024.png', optimize=True)
# Web: plain ("any") icons show the head crop; the maskable one leaves room for a circle mask (80% safe zone).
crop(HEAD, 192).save(f'{OUT}/app-icon-rose-192.png', optimize=True)
crop(HEAD, 512).save(f'{OUT}/app-icon-rose-512.png', optimize=True)
crop(HEAD / 0.8, 512).save(f'{OUT}/app-icon-rose-maskable-512.png', optimize=True)
crop(HEAD, 180).save(f'{OUT}/apple-touch-icon-rose.png', optimize=True)
crop(HEAD, 32).save(f'{OUT}/favicon-32.png', optimize=True)
crop(HEAD, 192).save(f'{OUT}/icon-192.png', optimize=True)
# Android: the adaptive layer is 108dp with the middle 72dp on show, so the head crop fills 2/3 of it.
res = f'{OUT}/res'
for dpi, legacy in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    d = f'{res}/mipmap-{dpi}'; os.makedirs(d, exist_ok=True)
    crop(HEAD * 1.5, legacy * 108 // 48).save(f'{d}/ic_launcher_foreground.png', optimize=True)
    rounded(crop(HEAD, legacy), 0.18).save(f'{d}/ic_launcher.png', optimize=True)
    circle(crop(HEAD, legacy)).save(f'{d}/ic_launcher_round.png', optimize=True)
print('done')
