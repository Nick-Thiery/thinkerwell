"""Makes the wordmark font: Eczar 500 with only the letters of "Thinkerwell".

    .venv/bin/python -m pip install fonttools brotli   # once
    .venv/bin/python scripts/subset_wordmark_font.py

Eczar draws one thing on the site: the "Thinkerwell" wordmark (the Logo in the
header, and the certificates). Fontsource's latin file has 255 glyphs (15 kB)
and every visitor downloads it before the first screen; the latin-ext file
(7 kB) is never used. This keeps the nine letters the wordmark needs (and the space), with
their outlines, spacing and kerning unchanged, in a 4 kB file:
src/styles/fonts/eczar-wordmark-500.woff2. fonts.css gives it a
unicode-range of exactly those nine letters and the space. src/styles/fonts.test.ts checks
that the wordmark (and app.name in every locale) uses no other letter; if it
ever does, add the text below and run this again.

The file also keeps the letters FreeType's auto-hinter measures a Latin font
by (HINTER_REFERENCE). Without them, Chrome on Linux lines up the tops and
bottoms of the letters a fraction of a pixel differently at 40px and above.
With them, the wordmark renders pixel for pixel as it did with the whole
font, at 22 and 40px, on 1x and 2x screens (checked with screenshots).
"""
from __future__ import annotations

import json
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "node_modules" / "@fontsource" / "eczar" / "files" / "eczar-latin-500-normal.woff2"
OUT = ROOT / "src" / "styles" / "fonts" / "eczar-wordmark-500.woff2"
WORDMARK = "Thinkerwell"
# FreeType's Latin blue-zone and stem-width letters (see above). Only in the
# file, not in the unicode-range: no page draws them in Eczar.
HINTER_REFERENCE = "THEZOCQSLUfijkdbhxzroescpqgjyo"


def main() -> None:
    names = {WORDMARK}
    for messages in sorted((ROOT / "src" / "i18n" / "messages").glob("*.json")):
        names.add(json.loads(messages.read_text(encoding="utf8"))["app"]["name"])
    # The space too: a browser takes a font's line height and baseline from
    # the first face whose unicode-range has U+0020, so without it the
    # wordmark would sit on Georgia's baseline.
    text = "".join(sorted(set(" " + "".join(names))))
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]  # keep kerning and every feature for these letters
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    font = subset.load_font(str(SOURCE), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text + HINTER_REFERENCE)
    subsetter.subset(font)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(OUT), options)
    ranges = ",".join(f"U+{ord(ch):04X}" for ch in text)
    print(f"{OUT.relative_to(ROOT)}: {OUT.stat().st_size} bytes, letters {text!r}")
    print(f"unicode-range: {ranges};")


if __name__ == "__main__":
    main()
