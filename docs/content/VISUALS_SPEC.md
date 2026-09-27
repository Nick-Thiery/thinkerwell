# Lesson pictures: drawing spec

Each lesson has one planned picture in its `visual` field (`type`, `description`, `alt`). You are drawing them as SVG files, in one consistent flat style, for learners about 10–17 who are learning English. Read the lesson's JSON first: the picture must match its evidence, reading and names exactly.

## Files and format

- Write `content/visuals/L{NN}.svg` (e.g. `L07.svg`). Don't edit any other files.
- `viewBox="0 0 960 540"`, no fixed width or height, `role="img"`, and `<title>` (a short name) plus `<desc>` (the lesson's `visual.alt`, word for word) as the first children.
- Hand-written, clean SVG: basic shapes and simple paths. No scripts, no `<foreignObject>`, no external references or fonts, no embedded images, no filters, gradients or shadows. Keep each file under 40 KB.
- Text uses `font-family="Atkinson Hyperlegible Next, Atkinson Hyperlegible, Verdana, sans-serif"`. Labels at least 22 units high, bold (700) for place names, and few words: a label, not a sentence. At most about 10 labels. Labels over busy areas get a white halo (`paint-order="stroke"`, `stroke="#FFFFFF"`, `stroke-width="6"`, `stroke-linejoin="round"`).
- Background: a full-size rounded rectangle (`rx="24"`) in the section tint (see palette) or white.

## Palette (use only these)

| Use | Hex |
|---|---|
| Ink (text, outlines) | `#0F0E0E` |
| Muted text | `#4B4654` |
| Lines, borders | `#D5D1DC` |
| White | `#FFFFFF` |
| River, water | `#6FB6D6` |
| Sea, lake | `#BFE0E8` |
| Land | `#DCEFD5` |
| Fields | `#7A9B4E` |
| Hill (outer, inner) | `#C9D9A8`, `#B5CB8E` |
| Forest | `#3F6B35` |
| Dry land, sand | `#F3E3C3` |
| Earth, wood | `#A07850` |
| Flood area, warm highlight | `#FDE68A` |
| Brand yellow (one highlight per picture at most) | `#FFFF66` |
| Lavender, soft lavender | `#D2C0F9`, `#ECE4FD` |
| Violet (arrows, emphasis) | `#4E32B5` |
| History tint / ink | `#FFE9C7` / `#7A4300` |
| Geography tint / ink | `#DCEFD5` / `#2D6326` |
| Culture tint / ink | `#FDE0E8` / `#8C2548` |
| Civics tint / ink | `#D7E7FB` / `#1E4E94` |
| Skin tones for simple figures | `#8D5524`, `#C68642`, `#E0AC69`, `#F1C27D` |

No red anywhere.

## Style

- Flat, friendly and calm, like a clear school diagram. Simple shapes, generous space, thick outlines (3–5 units) only where they help.
- Maps: a simple top-down view with a small key if colours carry meaning, a compass arrow (N) and, for real places, the words "Not to scale" in small muted text. Real-world maps are simplified shapes, but the relative positions must be right. Fictional places (Riverlands, Riverstone, Bayview…) must match the lesson's evidence descriptions.
- Timelines: left-to-right, dates as bold labels, events as short labels or simple icons.
- Diagrams: boxes and arrows (violet arrows), few words.
- People: simple rounded figures (a circle head and a rounded body), no facial detail beyond two dots at most, varied skin tones, varied clothing colours from the palette. No one looks sad, hurt or afraid.
- Never draw: religious symbols or holy figures, flags, weapons, soldiers, fire, disasters in progress, injured people, logos, brand names, or any known character or artwork. For Lesson 4 use neutral imagery (stars, a sun, an open book, people talking) with no religious symbols.
- For hard topics (floods, drought, trade that included enslaved people), draw the calm or the solution side: raised houses, planted trees, a map of routes. Never the harm.

## Checking your work

Render each SVG to PNG and look at it:

`node scripts/render_svg.js content/visuals/L07.svg`

This writes `L07.png` next to it (1280 wide) and prints any problems it can detect. Fix overlapping labels, clipped text, labels touching edges (keep 24 units of margin), and anything that doesn't match the lesson. Then delete the PNG.
