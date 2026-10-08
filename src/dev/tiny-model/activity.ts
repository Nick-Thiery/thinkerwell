/**
 * The "train a tiny model" activity's data, read from the draft lesson
 * (content/courses/digital-world/lessons/DW02.json, `activity`), so the prototype and the
 * draft can't drift apart. Dev only: the drafts are never part of the
 * production build (src/dev never is; see src/app/routes.tsx).
 *
 * When this becomes a real lesson, the activity moves into content/ with
 * the multi-course support in docs/content/DIGITAL_WORLD_SPEC.md section 9,
 * and is checked by the content schema instead of the narrowing below.
 */
import dw02 from '../../../content/courses/digital-world/lessons/DW02.json';

export const LEAF_LABELS = ['healthy', 'sick'] as const;
export type LeafLabel = (typeof LEAF_LABELS)[number];

export interface LeafCard {
  readonly id: string;
  readonly description: string;
  readonly gardenerSays: LeafLabel;
  /** How green, spots, size, shape (round to long), each 0 to 10. */
  readonly features: readonly [number, number, number, number];
}

export interface Round {
  readonly id: string;
  readonly title: string;
  readonly addExamples: readonly string[];
  readonly test: readonly string[];
  readonly expected: { readonly right: number; readonly of: number; readonly wrong: readonly string[] };
  readonly debrief: string;
}

export interface TinyModelActivity {
  readonly title: string;
  readonly instructions: string;
  readonly labels: readonly { readonly id: LeafLabel; readonly label: string }[];
  readonly features: readonly { readonly id: string; readonly label: string; readonly scale: string }[];
  readonly examples: readonly LeafCard[];
  readonly tests: readonly LeafCard[];
  readonly rounds: readonly Round[];
}

function isLeafLabel(value: string): value is LeafLabel {
  return (LEAF_LABELS as readonly string[]).includes(value);
}

function leafLabel(value: string, where: string): LeafLabel {
  if (!isLeafLabel(value)) throw new Error(`${where}: "${value}" is not healthy or sick.`);
  return value;
}

function card(raw: { id: string; description: string; gardenerSays: string; features: number[] }): LeafCard {
  const [green, spots, size, long] = raw.features;
  if (raw.features.length !== 4 || [green, spots, size, long].some((n) => n === undefined || n < 0 || n > 10)) {
    throw new Error(`${raw.id}: a card needs four numbers from 0 to 10.`);
  }
  return {
    id: raw.id,
    description: raw.description,
    gardenerSays: leafLabel(raw.gardenerSays, raw.id),
    features: [green ?? 0, spots ?? 0, size ?? 0, long ?? 0],
  };
}

const raw = dw02.activity;

export const ACTIVITY: TinyModelActivity = {
  title: raw.title,
  instructions: raw.instructions,
  labels: raw.labels.map((l) => ({ id: leafLabel(l.id, 'labels'), label: l.label })),
  features: raw.features,
  examples: raw.examples.map(card),
  tests: raw.tests.map(card),
  rounds: raw.rounds.map((r) => ({
    id: r.id,
    title: r.title,
    addExamples: r.addExamples,
    test: r.test,
    expected: r.expectedIfLabelledLikeTheGardener,
    debrief: r.debrief,
  })),
};

export function exampleById(id: string): LeafCard {
  const found = ACTIVITY.examples.find((e) => e.id === id);
  if (!found) throw new Error(`No example "${id}" in DW02.`);
  return found;
}

export function testById(id: string): LeafCard {
  const found = ACTIVITY.tests.find((e) => e.id === id);
  if (!found) throw new Error(`No test leaf "${id}" in DW02.`);
  return found;
}

/** The examples a round has, counting those added in earlier rounds, in the order they were added. */
export function examplesUpTo(roundIndex: number): LeafCard[] {
  return ACTIVITY.rounds.slice(0, roundIndex + 1).flatMap((r) => r.addExamples.map(exampleById));
}
