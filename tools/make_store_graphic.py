# Google Play feature graphic (1024x500) from the icon art: the girl on the left, fading into the roses
# and the night, the title and the hook on the right.
#   python3 tools/make_store_graphic.py assets/raw/icon_rose_girl.jpg app/store/feature-graphic-1024x500.png <fonts_dir> [WxH]
# <fonts_dir> holds CinzelDecorative-Bold.ttf.ttf and IMFeENsc28P.ttf.ttf from github.com/google/fonts (OFL).
# 1200x630 makes the link preview picture for the website.
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT, FONTS = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = (int(v) for v in (sys.argv[4] if len(sys.argv) > 4 else '1024x500').split('x'))
S = H / 500  # everything below is laid out for 500 tall
src = Image.open(SRC).convert('RGB')
DARK = np.array([18, 8, 16], np.float32)

# Roses behind the title: the roses-only top-right corner of the art, softened.
roses = src.crop((1450, 0, 2000, 400)).resize((round(688 * S), H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3))
canvas = np.empty((H, W, 3), np.float32); canvas[:] = DARK
canvas[:, W - roses.size[0]:] = np.asarray(roses, np.float32)

# The girl: the head crop, wider to the left, fading out on the right and at the bottom.
girl = np.asarray(src.crop((194, 20, 1750, 1420)).resize((round(556 * S), H), Image.LANCZOS), np.float32)
gh, gw = girl.shape[:2]
xx = np.arange(gw, dtype=np.float32); yy = np.arange(gh, dtype=np.float32)
ax = np.clip((gw - xx) / (170 * S), 0, 1); ax = ax * ax * (3 - 2 * ax)
ay = np.clip((gh - yy) / (40 * S), 0, 1); ay = ay * ay * (3 - 2 * ay)
a = (ay[:, None] * ax[None, :])[..., None]
canvas[:, :gw] = girl * a + canvas[:, :gw] * (1 - a)

# Night over the right half so the words read, plus a vignette all round.
X = np.arange(W, dtype=np.float32)[None, :]; Y = np.arange(H, dtype=np.float32)[:, None]
t = np.clip((X - 470 * S) / (220 * S), 0, 1); shade = 0.72 * t * t * (3 - 2 * t)
r = np.hypot((X - 300 * S) / (W - 264 * S), (Y - 230 * S) / (420 * S))
v = np.clip((r - 0.55) / 0.6, 0, 1); shade = np.clip(shade + 0.55 * v * v, 0, 0.9)
canvas = canvas * (1 - shade[..., None]) + DARK * shade[..., None]
img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8)).convert('RGBA')

# Words.
deco = f'{FONTS}/CinzelDecorative-Bold.ttf.ttf'
fell = f'{FONTS}/IMFeENsc28P.ttf.ttf'
f_top = ImageFont.truetype(deco, round(38 * S))
f_main = ImageFont.truetype(deco, round(60 * S))
f_tag = ImageFont.truetype(fell, round(30 * S))
CX = W - 242 * S


def spaced(draw, xy, text, font, fill, spacing, anchor_center=True):
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = xy[0] - total / 2 if anchor_center else xy[0]
    for ch, w in zip(text, widths):
        draw.text((x, xy[1]), ch, font=font, fill=fill, anchor='ls')
        x += w + spacing
    return total


def layer_text(fn):
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); fn(ImageDraw.Draw(lay)); return lay


def words(d, fill_top, fill_main, fill_tag, fill_rule):
    spaced(d, (CX, 196 * S), 'MERGE', f_top, fill_top, 14 * S)
    spaced(d, (CX, 270 * S), 'FARMSTEAD', f_main, fill_main, 2 * S)
    w = max(2, round(2 * S))
    d.line((CX - 150 * S, 300 * S, CX - 22 * S, 300 * S), fill=fill_rule, width=w)
    d.line((CX + 22 * S, 300 * S, CX + 150 * S, 300 * S), fill=fill_rule, width=w)
    d.ellipse((CX - 7 * S, 293 * S, CX + 7 * S, 307 * S), outline=fill_rule, width=w)
    spaced(d, (CX, 348 * S), 'Who took the Golden Bell?', f_tag, fill_tag, 1 * S)


# a red glow, then a dark drop shadow, then the letters
glow = layer_text(lambda d: words(d, (200, 30, 50, 255), (200, 30, 50, 255), (200, 30, 50, 200), (200, 30, 50, 160)))
glow = glow.filter(ImageFilter.GaussianBlur(14 * S))
shadow = layer_text(lambda d: words(d, (0, 0, 0, 230), (0, 0, 0, 230), (0, 0, 0, 230), (0, 0, 0, 0)))
shadow = shadow.filter(ImageFilter.GaussianBlur(3 * S))
off = Image.new('RGBA', img.size, (0, 0, 0, 0)); off.paste(shadow, (0, round(3 * S)))
front = layer_text(lambda d: words(d, (232, 194, 122, 255), (247, 234, 211, 255), (240, 160, 172, 255), (232, 194, 122, 220)))
for lay in (glow, off, front):
    img = Image.alpha_composite(img, lay)
img.convert('RGB').save(OUT, quality=95)
print('ok', img.size)
