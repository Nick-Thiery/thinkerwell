import { createElement, Fragment, type ReactNode } from 'react';
import { getReferenceRegistry } from './bundleLoader';
import './frame.css';

// Dev only. Rendered inside dev-reference.html (an isolated document) by
// reference-main.tsx: every component in docs/design-system/reference/bundle.js
// in a representative "main state", for /dev/reference to compare against
// /dev/components (the port) side by side. Grouped the same way bundle.js
// itself is commented (Actions, Brand, Progress, Course, Lesson, Voice and
// status, Learners and journal).
const MASCOT = '/images/thinkerwell-mascot-transparent.png';

interface Item {
  label: string;
  name: string;
  props?: Record<string, unknown>;
  children?: ReactNode;
  /** Wraps the rendered item in a fixed-width box (px) — for a component
   * (like ProgressBar) that fits its own width, so it doesn't collapse to
   * its content's minimum in this gallery's shrink-to-fit cell. */
  width?: number;
}

interface Group {
  title: string;
  items: Item[];
}

const GROUPS: Group[] = [
  {
    title: 'Actions',
    items: [
      { label: 'Button, primary', name: 'Button', props: { variant: 'primary', size: 'lg', iconRight: 'ArrowRight' }, children: 'Continue' },
      { label: 'Button, secondary', name: 'Button', props: { variant: 'secondary', icon: 'BookOpen' }, children: 'Read instead' },
      { label: 'Button, support', name: 'Button', props: { variant: 'support', icon: 'Lightbulb' }, children: 'Word help' },
      { label: 'Button, lemon', name: 'Button', props: { variant: 'lemon' }, children: 'Try again' },
      { label: 'Button, ghost', name: 'Button', props: { variant: 'ghost', icon: 'Eye' }, children: "Just look around" },
      { label: 'Button, disabled', name: 'Button', props: { variant: 'primary', disabled: true }, children: 'Continue' },
      { label: 'ToolToggle, pressed', name: 'ToolToggle', props: { icon: 'Volume2', pressed: true }, children: 'Listen' },
      { label: 'ToolToggle, unpressed', name: 'ToolToggle', props: { icon: 'Search', tone: 'support', pressed: false }, children: 'Key words' },
      {
        label: 'SegmentedControl',
        name: 'SegmentedControl',
        props: {
          label: 'Speed',
          value: 'normal',
          options: [
            { label: 'Slow', value: 'slow' },
            { label: 'Normal', value: 'normal' },
          ],
        },
      },
      { label: 'Chip, selected', name: 'Chip', props: { selected: true, icon: 'Check' }, children: 'Standard' },
      { label: 'Chip, starter', name: 'Chip', props: { variant: 'starter' }, children: 'One thing I noticed was…' },
      { label: 'Chip radio group', name: '__chip-row' },
      { label: 'Badge, lemon', name: 'Badge', props: { tone: 'lemon' }, children: 'Optional' },
      { label: 'Badge, lavender', name: 'Badge', props: { tone: 'lavender' }, children: 'Help' },
      { label: 'Badge, outline', name: 'Badge', props: { tone: 'outline' }, children: 'Draft' },
      { label: 'Badge, correct', name: 'Badge', props: { tone: 'correct', icon: 'Check' }, children: 'Correct' },
      { label: 'Badge, retry', name: 'Badge', props: { tone: 'retry', icon: 'RotateCcw' }, children: 'Not quite yet' },
      { label: 'Badge, ink', name: 'Badge', props: { tone: 'ink' }, children: 'New' },
      { label: 'Badge, history', name: 'Badge', props: { tone: 'history' }, children: 'History' },
      { label: 'Badge, geography', name: 'Badge', props: { tone: 'geography', icon: 'Map' }, children: 'Geography' },
      { label: 'Badge, culture', name: 'Badge', props: { tone: 'culture' }, children: 'Culture' },
      { label: 'Badge, civics', name: 'Badge', props: { tone: 'civics' }, children: 'Civics' },
      { label: 'ActionBar', name: 'ActionBar', props: { back: 'Back', next: 'Continue' } },
    ],
  },
  {
    title: 'Brand and chrome',
    items: [
      { label: 'Logo', name: 'Logo', props: { src: MASCOT } },
      { label: 'Mascot', name: 'Mascot', props: { src: MASCOT, size: 96 } },
      {
        label: 'SiteHeader',
        name: 'SiteHeader',
        props: {
          logoSrc: MASCOT,
          links: [
            { label: 'Home', active: true },
            { label: 'Course' },
            { label: 'For educators' },
            { label: 'About' },
          ],
          learner: { name: 'Amina', tone: 'lemon' },
        },
      },
      {
        label: 'SiteHeader, no learner',
        name: 'SiteHeader',
        props: {
          logoSrc: MASCOT,
          links: [{ label: 'Home', active: true }, { label: 'Course' }],
          learner: null,
        },
      },
      {
        label: 'SiteHeader, compact',
        name: 'SiteHeader',
        props: { logoSrc: MASCOT, learner: { name: 'Amina', tone: 'lemon' }, compact: true },
      },
    ],
  },
  {
    title: 'Progress',
    items: [
      { label: 'StagePath, horizontal', name: 'StagePath', props: { current: 'write', done: ['read'] } },
      {
        label: 'StagePath, vertical',
        name: 'StagePath',
        props: {
          current: 'write',
          done: ['read'],
          orientation: 'vertical',
          sublabels: { read: '3 parts · quick check' },
        },
      },
      { label: 'StagePath, compact', name: 'StagePath', props: { current: 'write', done: ['read'], compact: true } },
      { label: 'StageDots', name: 'StageDots', props: { current: 'write', done: ['read'] } },
      { label: 'ProgressRing', name: 'ProgressRing', props: { value: 3, max: 5 } },
      { label: 'ProgressRing, empty', name: 'ProgressRing', props: { value: 0, max: 5, label: null, ariaLabel: 'No sections started yet' } },
      { label: 'ProgressBar', name: 'ProgressBar', props: { value: 2, max: 4, label: 'Section 1', valueLabel: '2 of 4' }, width: 240 },
    ],
  },
  {
    title: 'Course',
    items: [
      { label: 'SectionBadge, history', name: 'SectionBadge', props: { section: 'history', number: 1 } },
      { label: 'SectionBadge, geography', name: 'SectionBadge', props: { section: 'geography', number: 2 } },
      { label: 'SectionBadge, culture', name: 'SectionBadge', props: { section: 'culture', number: 3 } },
      { label: 'SectionBadge, civics', name: 'SectionBadge', props: { section: 'civics', number: 4 } },
      {
        label: 'SectionHeader',
        name: 'SectionHeader',
        props: {
          section: 'history',
          number: 1,
          title: 'History & Human Stories',
          question: "What can we learn from a person's own story?",
          completed: 2,
          total: 6,
        },
      },
      {
        label: 'LessonRow, not started',
        name: 'LessonRow',
        props: {
          number: 11,
          title: 'How do maps help us understand a place?',
          status: 'not-started',
          time: 'About 30–50 min',
        },
      },
      {
        label: 'LessonRow, in progress',
        name: 'LessonRow',
        props: {
          number: 10,
          title: 'Why do people build towns near rivers?',
          status: 'in-progress',
          time: 'About 30–50 min',
          current: 'read',
        },
      },
      {
        label: 'LessonRow, completed',
        name: 'LessonRow',
        props: {
          number: 9,
          title: 'Why do some places have more resources than others?',
          status: 'completed',
          time: 'About 30–50 min',
        },
      },
      {
        label: 'LessonRow, quiz',
        name: 'LessonRow',
        props: {
          kind: 'quiz',
          title: 'Section check: Geography & Our Environment',
          question: '10 questions about Lessons 10–14. Try it any time, as often as you like.',
          time: 'About 15 min',
        },
      },
      {
        label: 'ContinueCard',
        name: 'ContinueCard',
        props: {
          title: 'Why do people build towns near rivers?',
          lessonLabel: 'Lesson 10',
          current: 'read',
          done: [],
          stageLabel: 'Read',
        },
      },
    ],
  },
  {
    title: 'Lesson content',
    items: [
      { label: 'TaskCard', name: 'TaskCard', props: { eyebrow: 'Before you read', icon: 'Lightbulb' }, children: 'Think of a place near water. Why might people live there?' },
      { label: 'ReadingCard', name: 'ReadingCard', props: { part: 'Part 1', heading: 'A town by the river' }, children: 'Many towns grow up next to rivers, because rivers bring water, food and a way to travel.' },
      {
        label: 'GlossaryTerm',
        name: 'GlossaryTerm',
        props: { word: 'community', definition: 'A group of people who live in the same place.' },
        children: 'community',
      },
      {
        label: 'GlossaryTerm, open',
        name: 'GlossaryTerm',
        props: {
          word: 'fertile',
          definition: 'Good for growing lots of plants and food.',
          example: 'Mud from the river makes the land at the River site fertile.',
          open: true,
        },
        children: 'fertile',
      },
      {
        label: 'DefinitionCard',
        name: 'DefinitionCard',
        props: { word: 'settlement', definition: 'A place where people live together, like a village or town.', example: 'Some of the first settlements grew beside rivers.' },
      },
      {
        label: 'EvidenceCard',
        name: 'EvidenceCard',
        props: { kind: 'map', title: 'Map of Riverlands', items: ['River site: flat farmland beside the river', 'Hill site: high ground, a walk from the river'] },
      },
      {
        label: 'EvidenceCard, fictional',
        name: 'EvidenceCard',
        props: {
          kind: 'note',
          title: "A trader's note",
          text: 'We carried grain down the river to the market and traded it for cloth.',
          quote: true,
          fictional: true,
        },
      },
      {
        label: 'ChoiceOption row',
        name: '__choice-row',
      },
      {
        label: 'Feedback, correct',
        name: 'Feedback',
        props: { tone: 'correct' },
        children: 'You found the reason in the second paragraph.',
      },
      {
        label: 'Feedback, retry',
        name: 'Feedback',
        props: { tone: 'retry' },
        children: 'Look for a detail on the object itself.',
      },
      {
        label: 'QuestionCard',
        name: 'QuestionCard',
        props: {
          eyebrow: 'Question 1 of 3',
          prompt: 'Why do towns often start near rivers?',
          options: ['Rivers bring water and food', 'Rivers are always warm', 'Rivers have no floods'],
          selected: 0,
          result: 'correct',
          feedback: 'Rivers give a town water, food and a way to travel.',
        },
      },
      { label: 'WritingBox', name: 'WritingBox', props: { label: 'Write two reasons', rows: 4, helper: 'Use words from the reading.' } },
      { label: 'TextField', name: 'TextField', props: { label: 'Your name', placeholder: 'Type your name' } },
      {
        label: 'VideoCard',
        name: 'VideoCard',
        props: { title: 'Rivers and towns', channel: 'Thinkerwell', duration: '3:20', captions: 'Captions available', language: 'English' },
      },
    ],
  },
  {
    title: 'Voice and status',
    items: [
      { label: 'VoiceButton, idle', name: 'VoiceButton', props: { state: 'idle' }, children: 'Say it' },
      { label: 'VoiceButton, listening', name: 'VoiceButton', props: { state: 'listening' } },
      { label: 'ListenBar', name: 'ListenBar', props: { label: 'Reading aloud', speed: 'normal' } },
      { label: 'VoiceRecorder, idle', name: 'VoiceRecorder', props: { state: 'idle' } },
      { label: 'VoiceRecorder, recording', name: 'VoiceRecorder', props: { state: 'recording', time: '0:12' } },
      { label: 'VoiceRecorder, recorded', name: 'VoiceRecorder', props: { state: 'recorded', time: '0:42' } },
      { label: 'StatusBanner, offline', name: 'StatusBanner', props: { tone: 'offline' }, children: 'You are offline. Your work is saved on this device.' },
      { label: 'StatusBanner, back', name: 'StatusBanner', props: { tone: 'back', title: "You're back online.", action: 'Dismiss' }, children: 'Your work is saved.' },
      { label: 'StatusBanner, info', name: 'StatusBanner', props: { tone: 'info', title: 'Slow internet?' }, children: 'Choose Read instead. It has the same ideas and uses almost no data.' },
      { label: 'Mascot, floating', name: 'Mascot', props: { src: MASCOT, size: 96, float: true } },
      { label: 'MascotTip', name: 'MascotTip', props: { src: MASCOT, size: 72 }, children: 'Take your time. You can come back any time.' },
      { label: 'MascotTip, lemon', name: 'MascotTip', props: { src: MASCOT, size: 72, tone: 'lemon' }, children: 'Nice work so far.' },
      { label: 'MascotTip, paper', name: 'MascotTip', props: { src: MASCOT, size: 72, tone: 'paper' }, children: 'Read it once before you answer.' },
      { label: 'ScoreSummary', name: 'ScoreSummary', props: { skills: [{ name: 'Reading', got: 4, of: 5 }, { name: 'Writing', got: 3, of: 5 }] } },
    ],
  },
  {
    title: 'Learners and journal',
    items: [
      { label: 'LearnerTile', name: 'LearnerTile', props: { name: 'Amina', tone: 'lemon', meta: 'Up to Lesson 10' } },
      { label: 'LearnerTile, selected', name: 'LearnerTile', props: { name: 'Reza', tone: 'geography', meta: 'Up to Lesson 3', selected: true } },
      { label: 'LearnerTile, new', name: 'LearnerTile', props: { variant: 'new', name: "I'm new here" } },
      { label: 'LearnerTile, guest', name: 'LearnerTile', props: { variant: 'guest', name: 'Just look around' } },
      {
        label: 'JournalEntry, Writing',
        name: 'JournalEntry',
        props: {
          lessonNumber: 10,
          lessonTitle: 'Why do people build towns near rivers?',
          kind: 'Writing',
          text: 'Towns grow near rivers because the water helps farms and gives people a way to travel.',
          date: '12 March',
        },
      },
      {
        label: 'JournalEntry, Reflection',
        name: 'JournalEntry',
        props: {
          lessonNumber: 10,
          lessonTitle: 'Why do people build towns near rivers?',
          kind: 'Reflection',
          prompt: 'One thing I learned today is…',
          text: 'Rivers help a town with water, farms and trade. But rivers can also flood, so people have to plan for both.',
          date: 'today',
        },
      },
    ],
  },
];

function ChoiceOptionRow() {
  const registry = getReferenceRegistry();
  const ChoiceOption = registry?.ChoiceOption;
  if (!ChoiceOption) return null;
  const rows: Array<{ letter: string; state: 'idle' | 'selected' | 'correct' | 'retry'; muted?: boolean; text: string }> = [
    { letter: 'A', state: 'idle', text: 'It has fresh water all year' },
    { letter: 'B', state: 'selected', text: 'It is close to the mountains' },
    { letter: 'C', state: 'correct', text: 'It lets people move goods by boat' },
    { letter: 'D', state: 'retry', muted: true, text: 'It has more space for houses' },
  ];
  return (
    <div role="radiogroup" aria-label="Example question" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row) => (
        <Fragment key={row.letter}>
          {createElement(ChoiceOption, { letter: row.letter, state: row.state, muted: row.muted }, row.text)}
        </Fragment>
      ))}
    </div>
  );
}

function ChipRadioRow() {
  const registry = getReferenceRegistry();
  const Chip = registry?.Chip;
  if (!Chip) return null;
  const sites = ['Near the river', 'On the hill', 'In the forest'];
  return (
    <div role="radiogroup" aria-label="Where would you build the new town?" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {sites.map((site, index) => (
        <Fragment key={site}>{createElement(Chip, { role: 'radio', selected: index === 0 }, site)}</Fragment>
      ))}
    </div>
  );
}

function renderItem(item: Item): ReactNode {
  if (item.name === '__choice-row') return <ChoiceOptionRow />;
  if (item.name === '__chip-row') return <ChipRadioRow />;
  const registry = getReferenceRegistry();
  const Comp = registry?.[item.name];
  if (!Comp) {
    return <span style={{ color: 'var(--retry)' }}>Unknown component: {item.name}</span>;
  }
  const rendered = createElement(Comp, item.props, item.children);
  return item.width ? <div style={{ width: item.width }}>{rendered}</div> : rendered;
}

export function ReferenceFrameApp() {
  return (
    <div className="tw-reference-gallery">
      {GROUPS.map((group) => (
        <section className="tw-reference-group" key={group.title} aria-label={group.title}>
          <h2 className="h2">{group.title}</h2>
          <div className="tw-reference-row">
            {group.items.map((item, index) => (
              <div key={`${item.name}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="tw-reference-label">{item.label}</span>
                {renderItem(item)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
