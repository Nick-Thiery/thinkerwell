import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Icon, SegmentedControl, TaskCard } from '../../components/ds';
import { ACTIVITY, examplesUpTo, testById, type LeafCard, type LeafLabel } from './activity';
import { LeafPicture } from './LeafPicture';
import { test as runTest, train, type TestRun } from '../../courses/digital-world/activities/train-model/model';
import { TEXT } from './text';
import '../dev.css';
import './tinyModel.css';

/**
 * Dev only (see src/app/routes.tsx): a prototype of Digital World Lesson 2's
 * "train a tiny model" activity (docs/content/DIGITAL_WORLD_SPEC.md,
 * section 6; data from drafts/digital-world/DW02.json).
 *
 * The learner sorts example leaves into healthy and sick, trains the model,
 * and sees its guesses on new leaves next to the gardener's answers, round
 * by round (4 of 6, 6 of 6, 0 of 2, 8 of 8 when labelled like the gardener),
 * then plays freely. Everything is in memory: nothing is saved or sent.
 */

const ROUNDS = ACTIVITY.rounds;
/** The step after the last round. */
const FREE_PLAY = ROUNDS.length;
const STEP_TITLES = [...ROUNDS.map((r) => r.title), TEXT.freePlayTitle];
const ALL_EXAMPLES = examplesUpTo(ROUNDS.length - 1);
const ALL_TESTS = ACTIVITY.tests.map((t) => t.id);
const LABEL_TEXT: Record<LeafLabel, string> = Object.fromEntries(ACTIVITY.labels.map((l) => [l.id, l.label])) as Record<
  LeafLabel,
  string
>;

type Labels = Partial<Record<string, LeafLabel>>;

interface Trained {
  readonly run: TestRun<LeafLabel>;
  readonly exampleCount: number;
  readonly debrief: string | null;
}

interface HistoryRow {
  readonly key: number;
  readonly title: string;
  readonly right: number;
  readonly of: number;
}

function examplesFor(step: number): LeafCard[] {
  return step < FREE_PLAY ? examplesUpTo(step) : ALL_EXAMPLES;
}

function testsFor(step: number): LeafCard[] {
  return (step < FREE_PLAY ? (ROUNDS[step]?.test ?? []) : ALL_TESTS).map(testById);
}

/** The id of the step after this one, for the "Next" button's words. */
function nextStepId(step: number): string {
  return ROUNDS[step + 1]?.id ?? 'free-play';
}

export default function TinyModelPage() {
  const [step, setStep] = useState(0);
  const [labels, setLabels] = useState<Labels>({});
  const [trained, setTrained] = useState<Trained | null>(null);
  const [changed, setChanged] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [announcement, setAnnouncement] = useState('');
  // Where focus goes after the next render: a label button on a card that
  // moved group, the results or the step heading.
  const pendingFocus = useRef<string | null>(null);
  const historyKey = useRef(0);

  useEffect(() => {
    const selector = pendingFocus.current;
    if (!selector) return;
    pendingFocus.current = null;
    document.querySelector<HTMLElement>(selector)?.focus();
  });

  const inPlay = examplesFor(step);
  const tests = testsFor(step);
  const unsorted = inPlay.filter((e) => !labels[e.id]);
  const labelled = inPlay.filter((e) => labels[e.id]);
  const isFreePlay = step === FREE_PLAY;
  const round = ROUNDS[step];
  const canTrain = isFreePlay ? labelled.length > 0 : unsorted.length === 0;
  const addedThisStep = round?.addExamples.length ?? 0;

  function setLabel(card: LeafCard, label: LeafLabel | null) {
    if (labels[card.id] === (label ?? undefined)) return;
    setLabels((current) => ({ ...current, [card.id]: label ?? undefined }));
    pendingFocus.current = label
      ? `[data-card-id="${card.id}"] .tw-seg button[aria-pressed="true"]`
      : `[data-card-id="${card.id}"] .tw-seg button`;
    if (trained) {
      setTrained(null);
      setChanged(true);
      setAnnouncement(TEXT.changed);
    }
  }

  function trainAndTest() {
    const examples = labelled.map((e) => ({ id: e.id, features: e.features, label: labels[e.id] as LeafLabel }));
    const model = train(examples);
    const run = runTest(
      model,
      tests.map((t) => ({ id: t.id, features: t.features, answer: t.gardenerSays })),
    );
    const likeTheGardener = labelled.every((e) => labels[e.id] === e.gardenerSays);
    const debrief = !likeTheGardener ? TEXT.yourLabelsDiffer : round ? round.debrief : null;
    setTrained({ run, exampleCount: examples.length, debrief });
    setChanged(false);
    historyKey.current += 1;
    setHistory((rows) => [...rows, { key: historyKey.current, title: STEP_TITLES[step] ?? '', right: run.right, of: run.of }]);
    setAnnouncement([TEXT.score(run.right, run.of), debrief].filter(Boolean).join(' '));
    pendingFocus.current = '#tw-tm-results-title';
  }

  function goToStep(next: number) {
    setStep(next);
    setTrained(null);
    setChanged(false);
    setAnnouncement('');
    pendingFocus.current = '#tw-tm-step-title';
  }

  function startAgain() {
    setLabels({});
    setHistory([]);
    goToStep(0);
  }

  const trainHelp = canTrain
    ? null
    : isFreePlay
      ? TEXT.trainHelpEmpty
      : TEXT.trainHelpSort(unsorted.length);
  const trainLabel = round && round.addExamples.length === 0 ? TEXT.testNewPlant : TEXT.train;

  return (
    <div className="tw-tm">
      <header className="tw-tm-intro">
        <p className="eyebrow">{TEXT.eyebrow}</p>
        <h1 className="h1" tabIndex={-1}>
          {ACTIVITY.title}
        </h1>
        <p className="body-lg tw-tm-measure">{ACTIVITY.instructions}</p>
        <p className="small tw-tm-devnote">
          <Icon name="Info" size={18} />
          <span>{TEXT.devNote}</span>
        </p>
      </header>

      <nav aria-label={TEXT.roundsLabel}>
        <ol className="tw-tm-steps" role="list">
          {STEP_TITLES.map((title, i) => (
            <li key={title} className="tw-tm-step" aria-current={i === step ? 'step' : undefined} data-done={i < step || undefined}>
              {i < step ? <Icon name="Check" size={18} /> : <span className="tw-tm-step-num">{i + 1}</span>}
              <span>{title}</span>
            </li>
          ))}
        </ol>
      </nav>

      <section className="tw-tm-panel" aria-labelledby="tw-tm-step-title">
        <p className="eyebrow tw-tm-muted">{TEXT.stepOf(step + 1, STEP_TITLES.length)}</p>
        <h2 id="tw-tm-step-title" className="h2" tabIndex={-1}>
          {STEP_TITLES[step]}
        </h2>
        <TaskCard>
          <p className="body-lg">
            {isFreePlay
              ? TEXT.freePlayIntro
              : addedThisStep > 0
                ? `${TEXT.newExamples(addedThisStep)} ${TEXT.toSortHelp}`
                : TEXT.noNewExamples}
          </p>
        </TaskCard>

        {unsorted.length > 0 ? (
          <CardGroup
            id="unsorted"
            title={isFreePlay ? TEXT.notUsedTitle : TEXT.toSortTitle}
            help={isFreePlay ? TEXT.notUsedHelp : TEXT.toSortHelp}
            cards={unsorted}
            labels={labels}
            onLabel={setLabel}
            canTakeOut={false}
          />
        ) : null}

        <div className="tw-tm-groups">
          {ACTIVITY.labels.map((l) => (
            <CardGroup
              key={l.id}
              id={l.id}
              title={TEXT.groupTitle[l.id]}
              cards={labelled.filter((e) => labels[e.id] === l.id)}
              labels={labels}
              onLabel={setLabel}
              canTakeOut={isFreePlay}
              showCount
            />
          ))}
        </div>

        <div className="tw-tm-actions">
          {trained ? null : (
            <>
              <Button size="lg" icon="Sprout" disabled={!canTrain} aria-describedby={trainHelp ? 'tw-tm-train-help' : undefined} onClick={trainAndTest}>
                {trainLabel}
              </Button>
              {trainHelp ? (
                <p id="tw-tm-train-help" className="small tw-tm-muted">
                  {trainHelp}
                </p>
              ) : changed ? (
                <p className="small tw-tm-muted">{TEXT.changed}</p>
              ) : null}
            </>
          )}
        </div>

        {trained ? (
          <Results trained={trained} />
        ) : null}

        {trained ? (
          <div className="tw-tm-actions">
            {step < FREE_PLAY ? (
              <Button size="lg" iconRight="ArrowRight" onClick={() => goToStep(step + 1)}>
                {TEXT.next[nextStepId(step)]}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="tw-tm-side">
        <section className="tw-tm-panel" aria-labelledby="tw-tm-history-title">
          <h2 id="tw-tm-history-title" className="h3">
            {TEXT.historyTitle}
          </h2>
          {history.length === 0 ? (
            <p className="body tw-tm-muted">{TEXT.historyNone}</p>
          ) : (
            <ol className="tw-tm-history" role="list" data-testid="tw-tm-history">
              {history.map((row) => (
                <li key={row.key}>
                  <span>{row.title}</span>
                  <b>{TEXT.historyScore(row.right, row.of)}</b>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="tw-tm-panel" aria-labelledby="tw-tm-how-title">
          <h2 id="tw-tm-how-title" className="h3">
            {TEXT.howTitle}
          </h2>
          <ol className="body tw-tm-how">
            {TEXT.how.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <Button variant="secondary" icon="RotateCcw" onClick={startAgain}>
            {TEXT.startAgain}
          </Button>
        </section>
      </div>

      <div className="tw-visually-hidden" role="status" aria-live="polite" data-testid="tw-tm-announcer">
        {announcement}
      </div>
    </div>
  );
}

interface CardGroupProps {
  id: string;
  title: string;
  help?: string;
  cards: readonly LeafCard[];
  labels: Labels;
  onLabel: (card: LeafCard, label: LeafLabel | null) => void;
  canTakeOut: boolean;
  showCount?: boolean;
}

function CardGroup({ id, title, help, cards, labels, onLabel, canTakeOut, showCount }: CardGroupProps) {
  const headingId = `tw-tm-group-${id}`;
  return (
    <section className="tw-tm-group" data-group={id} aria-labelledby={headingId}>
      <div className="tw-tm-group-head">
        <h3 id={headingId} className="h3">
          {title}
        </h3>
        {showCount ? <Badge tone="outline">{TEXT.groupCount(cards.length)}</Badge> : null}
      </div>
      {help ? <p className="small tw-tm-muted">{help}</p> : null}
      {cards.length === 0 ? (
        <p className="body tw-tm-muted">{TEXT.groupEmpty}</p>
      ) : (
        <ul className="tw-tm-cards" role="list">
          {cards.map((card) => (
            <li key={card.id}>
              <ExampleCard card={card} label={labels[card.id] ?? null} onLabel={onLabel} canTakeOut={canTakeOut} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ExampleCardProps {
  card: LeafCard;
  label: LeafLabel | null;
  onLabel: (card: LeafCard, label: LeafLabel | null) => void;
  canTakeOut: boolean;
}

function ExampleCard({ card, label, onLabel, canTakeOut }: ExampleCardProps) {
  return (
    <article className="tw-tm-card" data-card-id={card.id} aria-label={card.description}>
      <div className="tw-tm-card-top">
        <LeafPicture card={card} />
        <p className="label">{card.description}</p>
      </div>
      <SegmentedControl
        label={TEXT.labelFor(card.description)}
        options={ACTIVITY.labels.map((l) => ({ label: l.label, value: l.id }))}
        value={label ?? undefined}
        onChange={(value) => onLabel(card, value as LeafLabel)}
      />
      {canTakeOut && label ? (
        <Button variant="ghost" icon="X" aria-label={TEXT.takeOutFor(card.description)} onClick={() => onLabel(card, null)}>
          {TEXT.takeOut}
        </Button>
      ) : null}
      <Numbers card={card} />
    </article>
  );
}

function Numbers({ card }: { card: LeafCard }) {
  return (
    <details className="tw-tm-numbers">
      <summary className="small">{TEXT.numbersSummary}</summary>
      <p className="small">{TEXT.numbersIntro}</p>
      <dl className="small">
        {ACTIVITY.features.map((f, i) => (
          <div key={f.id}>
            <dt>{f.label}</dt>
            <dd>{card.features[i]}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function Results({ trained }: { trained: Trained }) {
  const { run, exampleCount, debrief } = trained;
  return (
    <section className="tw-tm-results" aria-labelledby="tw-tm-results-title">
      <h3 id="tw-tm-results-title" className="h3" tabIndex={-1}>
        {TEXT.resultsTitle}
      </h3>
      <p className="body-lg tw-tm-score" data-testid="tw-tm-score">
        <strong>{TEXT.score(run.right, run.of)}</strong> {TEXT.learnedFrom(exampleCount)}
      </p>
      {debrief ? <p className="body-lg tw-tm-measure">{debrief}</p> : null}
      <ul className="tw-tm-guesses" role="list">
        {run.results.map((result) => {
          const card = testById(result.card.id);
          const nearest = ALL_EXAMPLES.find((e) => e.id === result.guess.nearest.id);
          return (
            <li key={card.id}>
              <article className="tw-tm-guess" data-right={result.right} aria-label={card.description}>
                <div className="tw-tm-card-top">
                  <LeafPicture card={card} />
                  <div className="tw-tm-guess-text">
                    <p className="label">{card.description}</p>
                    <Badge tone={result.right ? 'correct' : 'retry'} icon={result.right ? 'Check' : 'RotateCcw'}>
                      {result.right ? TEXT.right : TEXT.notQuite}
                    </Badge>
                  </div>
                </div>
                <dl className="tw-tm-says body">
                  <div>
                    <dt>{TEXT.modelSaid}</dt>
                    <dd>{LABEL_TEXT[result.guess.label]}</dd>
                  </div>
                  <div>
                    <dt>{TEXT.gardenerSays}</dt>
                    <dd>{LABEL_TEXT[card.gardenerSays]}</dd>
                  </div>
                </dl>
                {nearest ? (
                  <div className="tw-tm-nearest">
                    <LeafPicture card={nearest} size={56} />
                    <p className="small">
                      {TEXT.lookedLike(LABEL_TEXT[result.guess.label])} ({nearest.description})
                    </p>
                  </div>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
