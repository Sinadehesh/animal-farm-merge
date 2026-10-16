"""Make a texture repeat without seams: blend it with a copy of itself shifted by
half its width, the copy showing at the left and right ends (where it joins up
seamlessly) and the original in the middle; then the same top to bottom.

Usage:
    python tools/seamless.py <in> <out.webp> <out_width>
"""
import sys

import numpy as np
from PIL import Image

src, out, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
a = np.asarray(Image.open(src).convert('RGB')).astype(float)


def wrap(img, axis):
    """Seamless along one axis: the half-shifted copy at the two ends, the original in the middle."""
    n = img.shape[axis]
    shifted = np.roll(img, n // 2, axis=axis)
    t = np.arange(n)
    m = np.clip(np.minimum(t, n - 1 - t) / (n * 0.25), 0, 1)
    m = m * m * (3 - 2 * m)
    m = m[None, :, None] if axis == 1 else m[:, None, None]
    return img * m + shifted * (1 - m)


c = wrap(wrap(a, 1), 0)  # across, then down (each hides the other's seam in its middle)
h, w, _ = a.shape
img = Image.fromarray(c.astype(np.uint8)).resize((width, round(width * h / w)), Image.LANCZOS)
img.save(out, quality=80, method=6)
print(out, img.size)
