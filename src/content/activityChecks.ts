/**
 * Checks on a lesson's activity that the zod schema (./schema.ts) can't
 * make on its own: ids that are unique, references that exist (a sort
 * item's suggested group, a round's example cards, a message part's sign),
 * where it sits, and, for `train-model`, that each round's expected result
 * is what the model really gets with every example labelled like the
 * gardener (docs/content/DIGITAL_WORLD_SPEC.md section 6). Runs at build
 * time and in tests, with the rest of ./load.ts; never in the browser.
 */
// With extensions: vite.config.ts loads this through ./load.ts.
import { test as runTest, train } from '../courses/digital-world/activities/train-model/model.ts';
import type { Activity, ActivityPlacement, TrainModelActivity } from './schema.ts';
import type { StageId } from './stages.ts';

/** Where each placement goes. */
const PLACEMENT_STAGE: Record<ActivityPlacement, StageId> = {
  'after-evidence': 'read',
  'before-prompt': 'write',
};

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) twice.add(id);
    seen.add(id);
  }
  return [...twice];
}

/** Every problem with an activity, each starting with `where` ("content/courses/digital-world/lessons/DW02.json: activity"). */
export function activityProblems(activity: Activity, where: string): string[] {
  const problems: string[] = [];
  const say = (problem: string) => problems.push(`${where}: ${problem}`);
  const unique = (what: string, ids: readonly string[]) => {
    for (const id of duplicates(ids)) say(`two ${what} have id "${id}"`);
  };

  if (PLACEMENT_STAGE[activity.placement] !== activity.stage) {
    say(`placement "${activity.placement}" belongs in the ${PLACEMENT_STAGE[activity.placement]} stage, not ${activity.stage}`);
  }

  switch (activity.type) {
    case 'sort': {
      const groups = activity.groups.map((group) => group.id);
      unique('groups', groups);
      unique('items', activity.items.map((item) => item.id));
      for (const item of activity.items) {
        if (!groups.includes(item.suggested)) say(`item "${item.id}" suggests "${item.suggested}", which isn't a group`);
      }
      break;
    }
    case 'train-model':
      problems.push(...trainModelProblems(activity, where));
      break;
    case 'compare-results': {
      unique('groups', activity.groups.map((group) => group.id));
      for (const group of activity.groups) {
        if (group.right > group.of) say(`group "${group.id}" has ${group.right} right of ${group.of}`);
      }
      const most = activity.groups.find((group) => group.id === activity.mostMistakes);
      if (!most) say(`mostMistakes "${activity.mostMistakes}" isn't a group`);
      else if (activity.groups.some((group) => group !== most && group.right / group.of <= most.right / most.of)) {
        say(`mostMistakes "${activity.mostMistakes}" isn't the one group with the fewest right`);
      }
      break;
    }
    case 'check-claim':
      unique('sources', activity.sources.map((source) => source.id));
      break;
    case 'spot-signs': {
      const signs = activity.signs.map((sign) => sign.id);
      unique('signs', signs);
      unique('messages', activity.messages.map((message) => message.id));
      for (const message of activity.messages) {
        message.parts.forEach((part, index) => {
          if (part.sign !== null && !signs.includes(part.sign)) say(`message "${message.id}" part ${index + 1} has sign "${part.sign}", which isn't a sign`);
          if (part.sign !== null && !part.feedback) say(`message "${message.id}" part ${index + 1} is a sign with no feedback`);
        });
      }
      break;
    }
    case 'ask-tool':
      break;
    case 'chart-check': {
      unique('views', activity.views.map((view) => view.id));
      for (const view of activity.views) {
        if (view.axisStart >= view.axisEnd) say(`view "${view.id}" starts at ${view.axisStart}, not below its end ${view.axisEnd}`);
        for (const bar of activity.bars) {
          if (bar.value < view.axisStart || bar.value > view.axisEnd) say(`view "${view.id}" can't show ${bar.label} (${bar.value})`);
        }
      }
      break;
    }
    case 'design-plan': {
      unique('problems', activity.problems.map((problem) => problem.id));
      unique('steps', activity.steps.map((step) => step.id));
      if (activity.problems.filter((problem) => problem.own).length > 1) say('only one problem can be the learner’s own');
      for (const step of activity.steps) {
        if (step.kind === 'choice' && !step.options) say(`step "${step.id}" is a choice with no options`);
        if (step.kind === 'text' && step.options) say(`step "${step.id}" is a text step with options`);
      }
      break;
    }
  }
  return problems;
}

/** Card ids, labels and rounds that fit together, and each round's expected result. */
function trainModelProblems(activity: TrainModelActivity, where: string): string[] {
  const problems: string[] = [];
  const say = (problem: string) => problems.push(`${where}: ${problem}`);
  const labels = activity.labels.map((label) => label.id);
  for (const id of duplicates(labels)) say(`two labels have id "${id}"`);
  for (const id of duplicates([...activity.examples, ...activity.tests].map((card) => card.id))) say(`two cards have id "${id}"`);
  for (const id of duplicates(activity.rounds.map((round) => round.id))) say(`two rounds have id "${id}"`);
  for (const card of [...activity.examples, ...activity.tests]) {
    if (!labels.includes(card.gardenerSays)) say(`card "${card.id}": the gardener's label "${card.gardenerSays}" isn't a label`);
    if (card.features.length !== activity.features.length) {
      say(`card "${card.id}" has ${card.features.length} numbers, not one per feature (${activity.features.length})`);
    }
  }
  if (problems.length > 0) return problems;

  const examples = new Map(activity.examples.map((card) => [card.id, card]));
  const tests = new Map(activity.tests.map((card) => [card.id, card]));
  const added: string[] = [];
  for (const round of activity.rounds) {
    for (const id of round.addExamples) {
      if (!examples.has(id)) say(`round "${round.id}" adds "${id}", which isn't an example`);
      else if (added.includes(id)) say(`round "${round.id}" adds "${id}" again`);
      else added.push(id);
    }
    for (const id of round.test) if (!tests.has(id)) say(`round "${round.id}" tests "${id}", which isn't a test leaf`);
    if (problems.length > 0) continue;

    const expected = round.expectedIfLabelledLikeTheGardener;
    if (added.length === 0) {
      say(`round "${round.id}" has no examples to learn from`);
      continue;
    }
    const model = train(added.map((id) => examples.get(id)!).map((card) => ({ id: card.id, features: card.features, label: card.gardenerSays })));
    const run = runTest(
      model,
      round.test.map((id) => tests.get(id)!).map((card) => ({ id: card.id, features: card.features, answer: card.gardenerSays })),
    );
    if (expected.of !== run.of || expected.right !== run.right || expected.wrong.join() !== run.wrong.join()) {
      say(
        `round "${round.id}" expects ${expected.right} of ${expected.of} (wrong: ${expected.wrong.join(', ') || 'none'}), but the model gets ${run.right} of ${run.of} (wrong: ${run.wrong.join(', ') || 'none'})`,
      );
    }
  }
  return problems;
}
