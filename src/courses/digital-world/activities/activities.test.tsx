import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { dwActivity, renderInLesson } from '../testHarness';
import { ActivityOnPaper } from './ActivityOnPaper';
import { ActivityPlayer } from './ActivityPlayer';

// Every activity type the Digital World drafts use
// (docs/content/DIGITAL_WORLD_SPEC.md 5.2), played as a learner would, with
// the rules every player keeps: nothing locked, nothing scored where the
// spec says no score, any answer changeable, real controls with names, and
// what is saved with the lesson's work. No network: fetch must never run.

function noNetwork() {
  const fetch = vi.spyOn(globalThis, 'fetch');
  return () => expect(fetch).not.toHaveBeenCalled();
}

describe('sort (Lessons 1, 4, 7, 10)', () => {
  it('puts each item in a group with real radio buttons, and says what most people would say without marking anything wrong', async () => {
    const user = userEvent.setup();
    const checkNetwork = noNetwork();
    const activity = dwActivity(1, 'sort');
    const { saved } = renderInLesson(1, <ActivityPlayer activity={activity} />);
    expect(screen.getByRole('heading', { level: 3, name: 'AI or not AI?' })).toBeInTheDocument();

    const calculator = screen.getByRole('group', { name: 'Calculator' });
    expect(within(calculator).getAllByRole('radio')).toHaveLength(3);
    // Nothing is said until an item is placed.
    expect(screen.queryByText(/Most people would say not AI/)).not.toBeInTheDocument();

    // Placed "against" most people: still no "Not quite", just what most people say and why.
    await user.click(within(calculator).getByRole('radio', { name: 'Uses AI' }));
    expect(screen.getByText(/Most people would say not AI\. It follows fixed steps/)).toBeInTheDocument();
    expect(screen.queryByText(/Not quite|Correct/)).not.toBeInTheDocument();
    expect(saved.progress.activity?.answers.calculator).toBe('ai');

    // Any choice can change at any time.
    await user.click(within(calculator).getByRole('radio', { name: 'Not AI' }));
    expect(saved.progress.activity?.answers.calculator).toBe('not-ai');
    expect(saved.updates.at(-1)).toEqual({ immediate: true });

    // "Your groups" lists it, and how many are left.
    const summary = screen.getByRole('region', { name: 'Your groups' });
    expect(within(summary).getByText('Calculator')).toBeInTheDocument();
    expect(within(summary).getByText('Still to place: 7')).toBeInTheDocument();
    checkNetwork();
  });

  it('on paper, gives learners a box per group and teachers the group most people choose', () => {
    const activity = dwActivity(4, 'sort');
    const { view } = renderInLesson(4, <ActivityOnPaper activity={activity} forTeachers={false} />);
    expect(screen.queryByText(/Most people would say:/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Probably real').length).toBe(activity.items.length);
    view.unmount();
    renderInLesson(4, <ActivityOnPaper activity={activity} forTeachers />);
    expect(screen.getAllByText(/Most people would say:/)).toHaveLength(activity.items.length);
  });
});

describe('train-model (Lesson 2)', () => {
  const label = async (user: ReturnType<typeof userEvent.setup>, description: string, choice: 'Healthy' | 'Sick') =>
    user.click(within(screen.getByRole('group', { name: `Label for: ${description}` })).getByRole('button', { name: choice }));
  const score = () => screen.getByTestId('tw-dw-tm-score');

  it('trains on the device and gets 4 of 6, 6 of 6, 0 of 2 and 8 of 8 when labelled like the gardener', async () => {
    const user = userEvent.setup();
    const checkNetwork = noNetwork();
    const { saved } = renderInLesson(2, <ActivityPlayer activity={dwActivity(2, 'train-model')} />);

    const train = () => screen.getByRole('button', { name: 'Train the model' });
    expect(train()).toBeDisabled();
    expect(screen.getByText('Sort 2 more leaves to train the model.')).toBeInTheDocument();
    await label(user, 'Big dark green leaf', 'Healthy');
    await label(user, 'Brown leaf with spots', 'Sick');
    await user.click(train());
    expect(score()).toHaveTextContent('The model got 4 of 6 right.');
    expect(screen.getAllByText((_, element) => element?.textContent === 'It looked most like this example, so the model said “Sick”.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not quite')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Go on to “Round 2: more, different examples”' }));
    await label(user, 'Small new leaf, light green', 'Healthy');
    await label(user, 'Yellow leaf with no spots', 'Sick');
    await label(user, 'Green leaf with a few tiny marks', 'Healthy');
    await label(user, 'Small leaf with many spots', 'Sick');
    await user.click(train());
    expect(score()).toHaveTextContent('The model got 6 of 6 right.');

    await user.click(screen.getByRole('button', { name: 'Go on to “A new plant”' }));
    await user.click(screen.getByRole('button', { name: 'Test the new leaves' }));
    expect(score()).toHaveTextContent('The model got 0 of 2 right.');

    await user.click(screen.getByRole('button', { name: 'Go on to “Round 3: add the new plant”' }));
    await label(user, 'Long thin leaf with pale stripes', 'Healthy');
    await label(user, 'Long thin brown leaf with spots', 'Sick');
    await user.click(train());
    expect(score()).toHaveTextContent('The model got 8 of 8 right.');

    // Saved: only which rounds were trained; the labels stay in memory.
    expect(saved.progress.activity).toEqual({ answers: {}, seen: ['round-1', 'round-2', 'round-2-new-plant', 'round-3'] });
    checkNetwork();
  });

  it('opens any round at any time, and follows the learner’s labels in free play', async () => {
    const user = userEvent.setup();
    renderInLesson(2, <ActivityPlayer activity={dwActivity(2, 'train-model')} />);
    const rounds = screen.getByRole('navigation', { name: 'Rounds' });
    await user.click(within(rounds).getByRole('button', { name: /Try it yourself/ }));
    expect(within(rounds).getByRole('button', { name: /Try it yourself/ })).toHaveAttribute('aria-current', 'step');
    // Every example is there to label; one labelled the opposite way is enough to train.
    await label(user, 'Big dark green leaf', 'Sick');
    await user.click(screen.getByRole('button', { name: 'Train the model' }));
    expect(screen.getByText(/Some of your labels are different from the gardener's/)).toBeInTheDocument();
    // With only that one (sick) example, the model calls every leaf sick: it follows the learner.
    expect(score()).toHaveTextContent('The model got 3 of 8 right.');
  });

  it('on paper, lists the cards with their numbers, and for teachers the gardener’s labels and each round’s result', () => {
    const activity = dwActivity(2, 'train-model');
    renderInLesson(2, <ActivityOnPaper activity={activity} forTeachers />);
    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect(screen.getByText('Labelled like the gardener, the model gets 4 of 6 right.')).toBeInTheDocument();
    expect(screen.getByText('Labelled like the gardener, the model gets 8 of 8 right.')).toBeInTheDocument();
  });
});

describe('compare-results (Lesson 3)', () => {
  it('shows each group’s numbers, says "Not quite" or "Correct" for the tap, then asks whose examples were missing', async () => {
    const user = userEvent.setup();
    const { saved } = renderInLesson(3, <ActivityPlayer activity={dwActivity(3, 'compare-results')} />);
    expect(screen.getByText('19 of 20 right')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: /Whose examples/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Teachers/ }));
    expect(screen.getByText('Not quite yet')).toBeInTheDocument();
    expect(screen.getByText(/The tool did better for/)).toBeInTheDocument();
    // Any tap opens the follow-up question: nothing is locked behind the right answer.
    const question = screen.getByRole('radiogroup', { name: 'Whose examples were probably missing from the training data?' });

    await user.click(screen.getByRole('radio', { name: /Youngest learners/ }));
    expect(screen.getByText(/The tool made the most mistakes for/)).toBeInTheDocument();
    expect(saved.progress.activity?.answers.group).toBe('youngest');

    await user.click(within(question).getByRole('radio', { name: /Recordings of children's voices/ }));
    expect(saved.progress.activity?.answers.afterTap).toBe('0');
  });
});

describe('check-claim (Lesson 5)', () => {
  it('opens the sources in any order with a tap, and never locks the question behind them', async () => {
    const user = userEvent.setup();
    const { saved } = renderInLesson(5, <ActivityPlayer activity={dwActivity(5, 'check-claim')} />);
    // The question is there before any source is opened.
    expect(screen.getByRole('radiogroup', { name: 'What do the other sources say about the bridge?' })).toBeInTheDocument();
    expect(screen.getByText('Sources opened: 0 of 4')).toBeInTheDocument();

    const council = screen.getByRole('button', { name: /Town council notice/ });
    expect(council).toHaveAttribute('aria-expanded', 'false');
    await user.click(council);
    expect(council).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('The bridge closes for repairs on 3 and 4 May. It opens again on 5 May.')).toBeVisible();
    expect(screen.getByText('Sources opened: 1 of 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Brightwater Fact Check/ }));
    expect(saved.progress.activity?.seen).toEqual(['council', 'fact-check']);

    // Closing a source keeps it counted as opened.
    await user.click(council);
    expect(council).toHaveAttribute('aria-expanded', 'false');
    expect(within(council).getByText('Opened')).toBeInTheDocument();
  });
});

describe('spot-signs (Lesson 6)', () => {
  it('makes every part of every message a button that shows what it is, with no score and "Show all signs" always there', async () => {
    const user = userEvent.setup();
    const { saved } = renderInLesson(6, <ActivityPlayer activity={dwActivity(6, 'spot-signs')} />);
    const fee = screen.getByRole('button', { name: 'To get it, pay a small delivery fee.' });
    expect(fee).toHaveAttribute('aria-pressed', 'false');
    await user.click(fee);
    expect(fee).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Real prizes are free. If you must pay to get a prize, it is a scam.')).toBeInTheDocument();
    expect(saved.progress.activity?.seen).toEqual(['a:1']);

    // A part that isn't a sign says so, without calling it wrong.
    await user.click(screen.getByRole('button', { name: 'It is free.' }));
    expect(screen.getByText('Most people would not call this part a warning sign on its own.')).toBeInTheDocument();
    expect(screen.queryByText(/Not quite/)).not.toBeInTheDocument();

    // Tapping again hides it; "Show all signs" shows every sign without tapping anything.
    await user.click(fee);
    expect(fee).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Show all signs' }));
    expect(screen.getByRole('button', { name: 'Show all signs' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Real prizes are free. If you must pay to get a prize, it is a scam.')).toBeInTheDocument();
    expect(fee).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('ask-tool (Lesson 8)', () => {
  it('is always labelled as a pretend tool with pre-written answers, and never reaches the network', async () => {
    const user = userEvent.setup();
    const checkNetwork = noNetwork();
    const { saved } = renderInLesson(8, <ActivityPlayer activity={dwActivity(8, 'ask-tool')} />);
    expect(screen.getByText('Pretend tool')).toBeInTheDocument();
    expect(screen.getByText(/It is not a real AI, and nothing you choose is sent anywhere/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    const improve = screen.getByRole('radiogroup', { name: 'Which prompt would get a more useful answer?' });
    await user.click(within(improve).getByRole('radio', { name: /In two short sentences/ }));
    expect(screen.getByText(/Training data is the examples a computer learns from/)).toBeInTheDocument();
    expect(saved.progress.activity?.answers.improve).toBe('1');

    await user.click(screen.getByRole('button', { name: /The Hillview science book/ }));
    expect(screen.getByText(/Spiders have eight legs/)).toBeVisible();
    const check = screen.getByRole('radiogroup', { name: 'The tool sounds very sure. How can you check its answer?' });
    await user.click(within(check).getByRole('radio', { name: /Trust it/ }));
    expect(within(check.closest('section')!).getByText('Not quite yet')).toBeInTheDocument();
    checkNetwork();
  });
});

describe('chart-check (Lesson 9)', () => {
  it('draws each scale with every bar’s number on it, named for screen readers, and keeps the question open', async () => {
    const user = userEvent.setup();
    const { saved } = renderInLesson(9, <ActivityPlayer activity={dwActivity(9, 'chart-check')} />);
    const chart = screen.getByRole('img', { name: /Bananas sold each day/ });
    expect(chart).toHaveAccessibleName('Bar chart. Bananas sold each day. Stall A: 52 and Stall B: 50. The scale goes from 49 to 53.');
    expect(within(chart).getByText('52')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'How many more bananas does Stall A really sell each day?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start at zero' }));
    expect(screen.getByRole('img', { name: /Bananas/ })).toHaveAccessibleName(/The scale goes from 0 to 60\./);
    expect(screen.getByText('The scale starts at 0. The two bars look almost the same.')).toBeInTheDocument();
    expect(saved.progress.activity?.seen).toEqual(['zero']);
  });
});

describe('design-plan (Lesson 11)', () => {
  it('plans in steps the learner can go back to, saves the writing like other writing, and treats every design choice as fine', async () => {
    const user = userEvent.setup();
    const { saved } = renderInLesson(11, <ActivityPlayer activity={dwActivity(11, 'design-plan')} />);

    await user.click(screen.getByRole('radio', { name: 'A problem many people share in a community I know' }));
    await user.type(screen.getByRole('textbox', { name: 'Your problem' }), 'Rubbish by the river');
    expect(saved.progress.activity?.answers.own).toBe('Rubbish by the river');
    // Writing is saved after the typing pause, like the lesson's other writing.
    expect(saved.updates.at(-1)).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Use the sentence starter' }));
    // As in Write: a starter ending in "..." goes in without its dots, ready to carry on typing.
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveValue('The problem is ... It affects ');
    expect(saved.progress.activity?.answers).toMatchObject({ problem: 'own', own: 'Rubbish by the river', 'step:problem': 'The problem is ... It affects ' });

    // Any step, in any order.
    const steps = screen.getByRole('navigation', { name: 'Steps' });
    await user.click(within(steps).getByRole('button', { name: '2. Should AI be used?' }));
    expect(screen.getByRole('heading', { level: 4, name: '2. Should AI be used?' })).toHaveFocus();
    await user.click(screen.getByRole('radio', { name: 'No, another way is better' }));
    expect(screen.getByText(/That is a good design choice too/)).toBeInTheDocument();
    expect(screen.queryByText(/Not quite/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 4, name: '1. The problem' })).toBeInTheDocument();

    const plan = screen.getByRole('region', { name: 'Your plan' });
    expect(within(plan).getByText('Rubbish by the river')).toBeInTheDocument();
    expect(within(plan).getByText('No, another way is better')).toBeInTheDocument();
    expect(within(plan).getAllByText('Not answered yet')).toHaveLength(3);
  });

  it('says nothing is saved while looking around', () => {
    renderInLesson(11, <ActivityPlayer activity={dwActivity(11, 'design-plan')} />, 'look-around');
    expect(screen.getByText("You're looking around, so your plan isn't saved.")).toBeInTheDocument();
  });
});

describe('on paper', () => {
  it.each([
    [3, 'compare-results'],
    [5, 'check-claim'],
    [8, 'ask-tool'],
    [9, 'chart-check'],
  ] as const)('Lesson %i (%s) marks the right answers only for teachers, with a tick and words', (number, type) => {
    const activity = dwActivity(number, type);
    const { view } = renderInLesson(number, <ActivityOnPaper activity={activity} forTeachers={false} />);
    expect(screen.queryByText('Correct answer')).not.toBeInTheDocument();
    view.unmount();
    renderInLesson(number, <ActivityOnPaper activity={activity} forTeachers />);
    expect(screen.getAllByText('Correct answer').length).toBeGreaterThan(0);
  });

  it('gives Lessons 6 and 11 a paper version too', () => {
    renderInLesson(6, <ActivityOnPaper activity={dwActivity(6, 'spot-signs')} forTeachers />);
    expect(screen.getByText('Message D, on the Stonebridge Learning Centre notice board')).toBeInTheDocument();
    renderInLesson(11, <ActivityOnPaper activity={dwActivity(11, 'design-plan')} forTeachers={false} />);
    expect(screen.getByText('3. What it learns from')).toBeInTheDocument();
  });
});
