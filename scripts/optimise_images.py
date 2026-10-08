"""Makes the small images the site serves (public/images/) from the originals
in docs/design-system/assets/.

    python3 scripts/optimise_images.py

Needs Pillow and pyoxipng (.venv/bin/python -m pip install pillow pyoxipng).
Run it again whenever an original changes or a new image is added, and
commit both. Every image here is precached for offline use (vite.config.ts),
so each kilobyte is downloaded by every device.

Every PNG is then recompressed by oxipng (zopfli), which is lossless: the
pixels are exactly the same, only the file is smaller (about 15%).

- The mascot files keep their exact size (422 x 423) and artwork. They are
  saved as 256-colour PNGs: the transparency is unchanged and the colours
  differ from the original by less than 1/255 on average, which can't be
  seen, and the files are about a seventh of the size.
- The UN goal icons are shown at 72px (About), so they are resized to 144px
  (sharp on 2x screens), then saved as 256-colour PNGs without dithering
  (27 kB instead of 44 kB for the four). They are flat colours and white
  shapes; only anti-aliased edge pixels change, by less than 1/255 on
  average (at most 0.4/255, for goals 10 and 16), which can't be seen, even
  enlarged three times beside the full-colour version.
- The two team photos are shown at 104px, so they are resized to 208px wide
  (sharp on 2x screens) as progressive JPEGs without their metadata.
- The app icons (public/icons/, for the web app manifest and iOS home
  screens) are the transparent mascot, whole and unchanged, scaled onto a
  lemon square, as in thinkerwell-mascot-yellow-background.png. The
  maskable one leaves room for Android to cut it into a circle.
- The favicon (the icon in browser tabs and beside the site in Google
  Search) is the transparent mascot, whole and unchanged, centred on a
  transparent square: Google Search shows only square favicons, and the
  mascot is 422 x 423 (docs/notes/seo.md). public/favicon.ico holds it at
  16, 32 and 48px, for anything that asks for /favicon.ico by default;
  public/icons/favicon-96.png is the one index.html links: a multiple of
  48px and larger than 48px, as Google recommends, and small (about 2 kB),
  because every first visit fetches it. Neither is precached: browsers
  keep their own copy of a site's icon.
- The link-sharing picture (social-card.png, 1200 x 630, drawn by
  scripts/make_social_card.mjs) goes to public/social-card.png as a
  256-colour PNG. index.html points the Open Graph and Twitter tags at it.
  It isn't precached: only the apps that preview a link fetch it.
"""
from __future__ import annotations

import sys
from pathlib import Path

import oxipng
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "design-system" / "assets"
OUT = ROOT / "public" / "images"
ICONS_OUT = ROOT / "public" / "icons"
LEMON = (0xFF, 0xFF, 0x66, 0xFF)

MASCOTS = [
    "thinkerwell-mascot-transparent.png",
    "thinkerwell-mascot-white-background.png",
    "thinkerwell-mascot-yellow-background.png",
]
UN_GOALS = ["sdg-04.png", "sdg-10.png", "sdg-16.png", "sdg-17.png"]
PHOTOS = {"founder-justin-park.jpg": 208, "nick-thiery.jpg": 208}
SOCIAL_CARD = "social-card.png"
ICON_BOX = 144
# name: (square size, how tall the mascot is drawn in it)
APP_ICONS = {
    "icon-192.png": (192, 176),
    "icon-512.png": (512, 423),
    "icon-maskable-512.png": (512, 330),
    "apple-touch-icon.png": (180, 150),
}
FAVICON_PNG = ("favicon-96.png", 96)
FAVICON_ICO_SIZES = [(16, 16), (32, 32), (48, 48)]


def lossless(dest: Path) -> None:
    """Recompresses a PNG without changing a pixel."""
    oxipng.optimize(dest, level=6, strip=oxipng.StripChunks.safe(), deflate=oxipng.Deflaters.zopfli(15))


def palette_png(src: Path, dest: Path) -> None:
    image = Image.open(src).convert("RGBA")
    # FASTOCTREE is the Pillow quantizer that keeps the alpha channel.
    image.quantize(256, method=Image.Quantize.FASTOCTREE).save(dest, optimize=True)
    lossless(dest)


def resized_palette_png(src: Path, dest: Path, box: int) -> None:
    image = Image.open(src).convert("RGB")  # the icons are fully opaque
    image.thumbnail((box, box), Image.Resampling.LANCZOS)
    image.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(dest, optimize=True)
    lossless(dest)


def resized_jpeg(src: Path, dest: Path, width: int) -> None:
    image = Image.open(src).convert("RGB")
    height = round(image.height * width / image.width)
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    image.save(dest, quality=80, optimize=True, progressive=True)


def social_card(src: Path, dest: Path) -> None:
    Image.open(src).convert("RGB").quantize(256, method=Image.Quantize.MEDIANCUT).save(dest, optimize=True)
    lossless(dest)


def app_icon(src: Path, dest: Path, size: int, mascot_height: int) -> None:
    mascot = Image.open(src).convert("RGBA")
    width = round(mascot.width * mascot_height / mascot.height)
    mascot = mascot.resize((width, mascot_height), Image.Resampling.LANCZOS)
    square = Image.new("RGBA", (size, size), LEMON)
    square.alpha_composite(mascot, ((size - width) // 2, (size - mascot_height) // 2))
    square.convert("RGB").quantize(256, method=Image.Quantize.MEDIANCUT).save(dest, optimize=True)
    lossless(dest)


def square_mascot(src: Path) -> Image.Image:
    """The mascot, whole and unchanged, centred on a transparent square as wide as its longer side."""
    mascot = Image.open(src).convert("RGBA")
    side = max(mascot.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(mascot, ((side - mascot.width) // 2, (side - mascot.height) // 2))
    return square


def favicons(src: Path) -> None:
    square = square_mascot(src)
    name, size = FAVICON_PNG
    dest = ICONS_OUT / name
    square.resize((size, size), Image.Resampling.LANCZOS).quantize(256, method=Image.Quantize.FASTOCTREE).save(dest, optimize=True)
    lossless(dest)
    print(f"icons/{name}: {size} x {size}, {dest.stat().st_size / 1024:.1f} kB")
    ico = ROOT / "public" / "favicon.ico"
    # Pillow scales the square down to each size (LANCZOS) and stores them all in one file.
    square.save(ico, sizes=FAVICON_ICO_SIZES)
    print(f"favicon.ico: {', '.join(f'{w}' for w, _ in FAVICON_ICO_SIZES)}px, {ico.stat().st_size / 1024:.1f} kB")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = (
        [(name, lambda s, d: palette_png(s, d)) for name in MASCOTS]
        + [(name, lambda s, d: resized_palette_png(s, d, ICON_BOX)) for name in UN_GOALS]
        + [(name, lambda s, d, w=w: resized_jpeg(s, d, w)) for name, w in PHOTOS.items()]
    )
    known = {name for name, _ in jobs} | {SOCIAL_CARD}
    unknown = sorted(p.name for p in SOURCE.iterdir() if p.is_file() and p.name not in known)
    if unknown:
        print(f"No rule for {', '.join(unknown)}: add one to scripts/optimise_images.py.", file=sys.stderr)
        return 1
    for name, job in jobs:
        src, dest = SOURCE / name, OUT / name
        job(src, dest)
        print(f"{name}: {src.stat().st_size / 1024:.1f} kB -> {dest.stat().st_size / 1024:.1f} kB")
    card = ROOT / "public" / SOCIAL_CARD
    social_card(SOURCE / SOCIAL_CARD, card)
    print(f"{SOCIAL_CARD}: {(SOURCE / SOCIAL_CARD).stat().st_size / 1024:.1f} kB -> {card.stat().st_size / 1024:.1f} kB")
    ICONS_OUT.mkdir(parents=True, exist_ok=True)
    for name, (size, mascot_height) in APP_ICONS.items():
        dest = ICONS_OUT / name
        app_icon(SOURCE / "thinkerwell-mascot-transparent.png", dest, size, mascot_height)
        print(f"icons/{name}: {size} x {size}, {dest.stat().st_size / 1024:.1f} kB")
    favicons(SOURCE / "thinkerwell-mascot-transparent.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
