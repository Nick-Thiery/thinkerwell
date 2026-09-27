"""Makes the small images the site serves (public/images/) from the originals
in docs/design-system/assets/.

    python3 scripts/optimise_images.py

Needs Pillow (pip install pillow). Run it again whenever an original changes
or a new image is added, and commit both. Every image here is precached for
offline use (vite.config.ts), so each kilobyte is downloaded by every device.

- The mascot files keep their exact size (422 x 423) and artwork. They are
  saved as 256-colour PNGs: the transparency is unchanged and the colours
  differ from the original by less than 1/255 on average, which can't be
  seen, and the files are about a seventh of the size.
- The UN goal icons are shown at 72px (About), so they are resized to 144px
  (sharp on 2x screens) and otherwise left as they are.
- The founder photo is shown at 104px, so it is resized to 312px wide (sharp
  on 3x phones) as a progressive JPEG without its metadata.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "design-system" / "assets"
OUT = ROOT / "public" / "images"

MASCOTS = [
    "thinkerwell-mascot-transparent.png",
    "thinkerwell-mascot-white-background.png",
    "thinkerwell-mascot-yellow-background.png",
]
UN_GOALS = ["sdg-04.png", "sdg-10.png", "sdg-16.png", "sdg-17.png"]
PHOTOS = {"founder-justin-park.jpg": 312}
ICON_BOX = 144


def palette_png(src: Path, dest: Path) -> None:
    image = Image.open(src).convert("RGBA")
    # FASTOCTREE is the Pillow quantizer that keeps the alpha channel.
    image.quantize(256, method=Image.Quantize.FASTOCTREE).save(dest, optimize=True)


def resized_png(src: Path, dest: Path, box: int) -> None:
    image = Image.open(src)
    image.thumbnail((box, box), Image.Resampling.LANCZOS)
    image.save(dest, optimize=True)


def resized_jpeg(src: Path, dest: Path, width: int) -> None:
    image = Image.open(src).convert("RGB")
    height = round(image.height * width / image.width)
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    image.save(dest, quality=80, optimize=True, progressive=True)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = (
        [(name, lambda s, d: palette_png(s, d)) for name in MASCOTS]
        + [(name, lambda s, d: resized_png(s, d, ICON_BOX)) for name in UN_GOALS]
        + [(name, lambda s, d, w=w: resized_jpeg(s, d, w)) for name, w in PHOTOS.items()]
    )
    known = {name for name, _ in jobs}
    unknown = sorted(p.name for p in SOURCE.iterdir() if p.is_file() and p.name not in known)
    if unknown:
        print(f"No rule for {', '.join(unknown)}: add one to scripts/optimise_images.py.", file=sys.stderr)
        return 1
    for name, job in jobs:
        src, dest = SOURCE / name, OUT / name
        job(src, dest)
        print(f"{name}: {src.stat().st_size / 1024:.1f} kB -> {dest.stat().st_size / 1024:.1f} kB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
