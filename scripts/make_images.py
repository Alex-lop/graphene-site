#!/usr/bin/env python3
"""Regenerate assets/og.png and assets/poster.png from the hero field.

Renders scripts/og.html in headless Chrome, then quantises the result -- the
field is nearly monochrome, so a 48-colour palette is visually identical and
about a fifth of the bytes. No external service is involved.

usage: python3 scripts/make_images.py
env:   CHROME=/path/to/chrome  (default: the macOS Google Chrome bundle)
"""
import os
import pathlib
import subprocess

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
PAGE = f"file://{ROOT / 'scripts' / 'og.html'}"

# name, render size, final width
TARGETS = [("og.png", (1200, 630), 1200), ("poster.png", (1600, 900), 1280)]


def main():
    for name, (w, h), final_w in TARGETS:
        out = ROOT / "assets" / name
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                        f"--screenshot={out}", f"--window-size={w},{h}",
                        "--virtual-time-budget=3000", PAGE],
                       check=True, capture_output=True)
        im = Image.open(out).convert("RGB")
        if final_w != im.width:
            im = im.resize((final_w, round(im.height * final_w / im.width)), Image.LANCZOS)
        im.quantize(colors=48, method=Image.MEDIANCUT,
                    dither=Image.Dither.FLOYDSTEINBERG).save(out, optimize=True)
        print(f"assets/{name}  {im.size[0]}x{im.size[1]}  {out.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
