# Google Play phone screenshots (1080x1920, 9:16): a caption over each game screenshot, on the dark roses
# of the icon art.
#   node tools/store_screenshots.mjs http://localhost:8765/ <raw_dir>      (the game served locally)
#   python3 tools/make_store_screens.py <raw_dir> app/store/screenshots <fonts_dir>
# <fonts_dir> holds CinzelDecorative-Bold.ttf.ttf from github.com/google/fonts (OFL).
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAW, OUT, FONTS = sys.argv[1], sys.argv[2], sys.argv[3]
ART = os.path.join(os.path.dirname(__file__), '..', 'assets', 'raw', 'icon_rose_girl.jpg')
os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
SHOTS = [  # in the order Play shows them
    ('note', 'Someone left you a secret note'),
    ('board', 'Merge two to make something better'),
    ('case', 'Who is the secret friend?'),
    ('map', 'Fix up the old farm'),
    ('letter', 'Save the valley from Mr. Grimsby'),
    ('town', 'Bring Sunnyvale back to life'),
]

# Background: the roses-only corner of the icon art, blurred and darkened.
art = Image.open(ART).convert('RGB')
bg = art.crop((1450, 0, 2000, 980)).resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(10))
bg = np.asarray(bg, np.float32) * 0.32 + np.array([18, 8, 16], np.float32) * 0.68
bg = Image.fromarray(bg.astype(np.uint8))

font = ImageFont.truetype(os.path.join(FONTS, 'CinzelDecorative-Bold.ttf.ttf'), 70)
SCALE, TOP = 0.82, 300
sw, sh = round(W * SCALE), round(H * SCALE)
x0 = (W - sw) // 2


def wrap(draw, text, width):
    lines, line = [], ''
    for word in text.split():
        test = f'{line} {word}'.strip()
        if draw.textlength(test, font=font) <= width or not line:
            line = test
        else:
            lines.append(line); line = word
    return lines + [line]


for n, (name, caption) in enumerate(SHOTS, 1):
    img = bg.copy().convert('RGBA')
    # caption: one or two lines, centred in the band above the screenshot
    d = ImageDraw.Draw(img)
    lines = wrap(d, caption, W - 120)
    lh = 84
    y = (TOP - lh * len(lines)) / 2 + lh * 0.78
    glow = Image.new('RGBA', img.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for i, line in enumerate(lines):
        gd.text((W / 2, y + i * lh), line, font=font, fill=(200, 30, 50, 200), anchor='ms')
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        d.text((W / 2, y + i * lh + 4), line, font=font, fill=(0, 0, 0, 220), anchor='ms')
        d.text((W / 2, y + i * lh), line, font=font, fill=(247, 234, 211, 255), anchor='ms')
    # the screenshot, rounded, with a gold edge and a soft shadow
    shot = Image.open(os.path.join(RAW, f'{name}.png')).convert('RGB').resize((sw, sh), Image.LANCZOS)
    mask = Image.new('L', (sw * 2, sh * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw * 2 - 1, sh * 2 - 1), radius=88, fill=255)
    mask = mask.resize((sw, sh), Image.LANCZOS)
    shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x0, TOP + 14, x0 + sw, TOP + 14 + sh), radius=44, fill=(0, 0, 0, 170))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(img).rounded_rectangle((x0 - 4, TOP - 4, x0 + sw + 3, TOP + sh + 3), radius=48, fill=(232, 194, 122, 255))
    img.paste(shot, (x0, TOP), mask)
    img.convert('RGB').save(os.path.join(OUT, f'{n}-{name}.png'), optimize=True)
    print(n, name, caption)
