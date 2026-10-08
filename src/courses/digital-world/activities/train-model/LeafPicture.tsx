import { useId } from 'react';
import type { LeafCardData } from '../../../../content';

/**
 * A leaf card's drawing, made on the device as inline SVG from the card's
 * four numbers (size, shape, spots) plus a colour and stripes. No image
 * files, nothing from another server.
 *
 * The colour can't come from the numbers: "how green" is 4 for both the
 * light green new leaf and the yellow leaf (which is part of why the model
 * mixes them up in Round 1). So each card's colour is listed here, by card
 * id. These hints belong in the lesson file next to each card (for example
 * a `look` field) once the team decides how Lesson 2's pictures are drawn
 * (docs/content/VISUALS_SPEC.md); the lesson's wording wasn't changed for
 * the preview. A card without one is drawn green.
 *
 * The drawing is decorative (aria-hidden): every card shows its description
 * as text beside it.
 */

type LeafColour = 'darkGreen' | 'green' | 'lightGreen' | 'yellow' | 'brown' | 'paleGreen';

interface LeafLook {
  readonly colour: LeafColour;
  readonly stripes?: boolean;
}

const LOOKS: Record<string, LeafLook> = {
  e1: { colour: 'darkGreen' },
  e2: { colour: 'brown' },
  e3: { colour: 'lightGreen' },
  e4: { colour: 'yellow' },
  e5: { colour: 'green' },
  e6: { colour: 'green' },
  e7: { colour: 'paleGreen', stripes: true },
  e8: { colour: 'brown' },
  t1: { colour: 'green' },
  t2: { colour: 'brown' },
  t3: { colour: 'lightGreen' },
  t4: { colour: 'yellow' },
  t5: { colour: 'green' },
  t6: { colour: 'lightGreen' },
  t7: { colour: 'paleGreen', stripes: true },
  t8: { colour: 'paleGreen', stripes: true },
};

// Drawing colours, not interface colours: they never carry meaning on their
// own (the card's words do), and none of them is red.
const FILL: Record<LeafColour, string> = {
  darkGreen: '#2f6b2a',
  green: '#4f9a3c',
  lightGreen: '#a6d36b',
  yellow: '#e8c93a',
  brown: '#8a5a2b',
  paleGreen: '#7fb36a',
};
const SPOT = '#4a2f14';
const STRIPE = '#e9f5dc';
const OUTLINE = 'var(--ink)';

/** A small fixed pseudo-random sequence, so a card's spots are always in the same places. */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function LeafPicture({ card, size = 112 }: { card: LeafCardData; size?: number }) {
  // useId's characters aren't all safe inside url(#...).
  const clipId = `tw-dw-tm-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const look = LOOKS[card.id] ?? { colour: 'green' };
  const [, spots = 0, leafSize = 5, long = 0] = card.features;

  // Height grows with size; width shrinks as the shape gets longer.
  const scale = 0.45 + 0.055 * leafSize;
  const h = 84 * scale;
  const w = h / (1.1 + 0.3 * long);
  const top = -h / 2;
  const bottom = h / 2;
  const bulge = w * 0.65;
  const outline = `M 0 ${top} C ${bulge} ${-h / 4} ${bulge} ${h / 4} 0 ${bottom} C ${-bulge} ${h / 4} ${-bulge} ${-h / 4} 0 ${top} Z`;

  const random = seeded(card.id);
  const spotCount = Math.round(spots * 1.3);
  const spotRadius = Math.max(1.6, 3.2 * scale);
  const spotDots = Array.from({ length: spotCount }, () => {
    // A point inside an ellipse a bit smaller than the leaf.
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 0.8;
    return { x: Math.cos(angle) * radius * (w * 0.38), y: Math.sin(angle) * radius * (h * 0.38) };
  });

  return (
    <svg
      className="tw-dw-tm-leaf"
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="rotate(30)">
        <clipPath id={clipId}>
          <path d={outline} />
        </clipPath>
        <line x1="0" y1={bottom - 2} x2="0" y2={bottom + 10} stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" />
        <path d={outline} fill={FILL[look.colour]} />
        <g clipPath={`url(#${clipId})`}>
          {look.stripes
            ? [-0.28, 0.28].map((offset) => (
                <line
                  key={offset}
                  x1={w * offset}
                  y1={top}
                  x2={w * offset}
                  y2={bottom}
                  stroke={STRIPE}
                  strokeWidth={Math.max(2, w * 0.12)}
                />
              ))
            : null}
          {spotDots.map((dot, i) => (
            // On a striped leaf the marks are pale, like its stripes.
            <circle key={i} cx={dot.x} cy={dot.y} r={spotRadius} fill={look.stripes ? STRIPE : SPOT} />
          ))}
        </g>
        <line x1="0" y1={top + 4} x2="0" y2={bottom - 2} stroke={OUTLINE} strokeOpacity="0.45" strokeWidth="1.5" />
        <path d={outline} fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
