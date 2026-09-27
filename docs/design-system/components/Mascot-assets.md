# Mascot

- `thinkerwell-mascot-transparent.png` — the reader mascot with a transparent background, 422 × 423. Use it on any brand colour. It is the exact artwork of the two flat files below, with the background removed and nothing redrawn.
- `thinkerwell-mascot-white-background.png` — the same artwork on solid #FFFFFF, for printouts and emails.
- `thinkerwell-mascot-yellow-background.png` — the same artwork on solid #FFFF66 (`lemon`), for flat yellow placements.

Show it at 36–220px with `object-fit: contain` and its 422:423 ratio. Never crop it into a circle, recolour it, add a glow or shadow, or draw a new pose.

The full-size originals of these files, the UN goal icons and the founder photo are in `docs/design-system/assets/`. The site serves smaller copies from `public/images/`, made by `python3 scripts/optimise_images.py` (the mascot keeps its size and artwork, saved as a 256-colour PNG). Change an original, then run the script and commit both.
