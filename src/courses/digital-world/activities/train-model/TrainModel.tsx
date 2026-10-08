import { useEffect, useRef, useState } from 'react';
import { Badge, Button, SegmentedControl, TaskCard } from '../../../../components/ds';
import type { LeafCardData, TrainModelActivity } from '../../../../content';
import { useI18n } from '../../../../i18n';
import { useActivityState } from '../state';
import { LeafPicture } from './LeafPicture';
import { test as runTest, train, type TestRun } from './model';

/**
 * `train-model` (Lesson 2, docs/content/DIGITAL_WORLD_SPEC.md section 6),
 * ported from the dev prototype: the learner labels example leaves healthy
 * or sick, trains a nearest-neighbour model (./model.ts, k = 1, plain
 * TypeScript on the device), and sees its guesses on new leaves beside the
 * gardener's answers, round by round (4 of 6, 6 of 6, 0 of 2 for a new
 * plant, then 8 of 8 when labelled like the gardener), then plays freely.
 *
 * - Every round can be opened from the list at any time: nothing is locked.
 * - The model follows the learner's labels; the learner is never scored or
 *   told a label is wrong. "Right" and "Not quite" are about the model's
 *   guesses against the gardener's answers.
 * - Labels stay in memory (spec: "the labels are not needed again"); only
 *   the rounds trained are saved, with the lesson's other answers.
 * - No camera, microphone, network or machine-learning library; the
 *   drawings are made on the device from each card's numbers.
 */

type Labels = Partial<Record<string, string>>;

interface Trained {
  readonly run: TestRun;
  readonly exampleCount: number;
  /** The round's debrief (course text), 'differ' when the learner's labels differ from the gardener's, or null. */
  readonly debrief: string | null;
  readonly differ: boolean;
}

interface HistoryRow {
  readonly key: number;
  readonly title: string;
  readonly right: number;
  readonly of: number;
}

/** What is saved when the learner trains in free play. */
const FREE_PLAY_ID = 'free-play';

export function TrainModelPlayer({ activity }: { activity: TrainModelActivity }) {
  const { t, contentLang } = useI18n();
  const { see } = useActivityState();
  const rounds = activity.rounds;
  const freePlay = rounds.length;
  const exampleById = new Map(activity.examples.map((card) => [card.id, card]));
  const testById = new Map(activity.tests.map((card) => [card.id, card]));
  /** The examples a round has, with those added in earlier rounds, in the order they were added. */
  const examplesUpTo = (index: number) => rounds.slice(0, index + 1).flatMap((round) => round.addExamples.flatMap((id) => exampleById.get(id) ?? []));
  const allExamples = examplesUpTo(rounds.length - 1);
  const stepTitles = [...rounds.map((round) => round.title), t('digitalWorld.trainModel.freePlayTitle')];

  const [step, setStep] = useState(0);
  const [labels, setLabels] = useState<Labels>({});
  const [trained, setTrained] = useState<Trained | null>(null);
  const [changed, setChanged] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [announcement, setAnnouncement] = useState('');
  // Where focus goes after the next render: a label on a card that moved group, the results or the step heading.
  const pendingFocus = useRef<string | null>(null);
  const historyKey = useRef(0);

  useEffect(() => {
    const selector = pendingFocus.current;
    if (!selector) return;
    pendingFocus.current = null;
    document.querySelector<HTMLElement>(selector)?.focus();
  });

  const isFreePlay = step === freePlay;
  const round = rounds[step];
  const inPlay = isFreePlay ? allExamples : examplesUpTo(step);
  const tests = (isFreePlay ? activity.tests.map((card) => card.id) : (round?.test ?? [])).flatMap((id) => testById.get(id) ?? []);
  const unsorted = inPlay.filter((card) => !labels[card.id]);
  const labelled = inPlay.filter((card) => labels[card.id]);
  const canTrain = isFreePlay ? labelled.length > 0 : unsorted.length === 0;
  const addedThisStep = round?.addExamples.length ?? 0;

  function setLabel(card: LeafCardData, label: string | null) {
    if (labels[card.id] === (label ?? undefined)) return;
    setLabels((current) => ({ ...current, [card.id]: label ?? undefined }));
    pendingFocus.current = label
      ? `[data-card-id="${card.id}"] .tw-seg button[aria-pressed="true"]`
      : `[data-card-id="${card.id}"] .tw-seg button`;
    if (trained) {
      setTrained(null);
      setChanged(true);
      setAnnouncement(t('digitalWorld.trainModel.changed'));
    }
  }

  function trainAndTest() {
    const model = train(labelled.map((card) => ({ id: card.id, features: card.features, label: labels[card.id] ?? '' })));
    const run = runTest(
      model,
      tests.map((card) => ({ id: card.id, features: card.features, answer: card.gardenerSays })),
    );
    const differ = !labelled.every((card) => labels[card.id] === card.gardenerSays);
    setTrained({ run, exampleCount: labelled.length, debrief: differ ? null : (round?.debrief ?? null), differ });
    setChanged(false);
    historyKey.current += 1;
    setHistory((rows) => [...rows, { key: historyKey.current, title: stepTitles[step] ?? '', right: run.right, of: run.of }]);
    setAnnouncement(t('digitalWorld.trainModel.score', { right: run.right, of: run.of }));
    pendingFocus.current = '#tw-dw-tm-results-title';
    // Saved with the lesson's answers: which rounds the learner trained.
    see(round?.id ?? FREE_PLAY_ID);
  }

  function goToStep(next: number) {
    setStep(next);
    setTrained(null);
    setChanged(false);
    setAnnouncement('');
    pendingFocus.current = '#tw-dw-tm-step-title';
  }

  function startAgain() {
    setLabels({});
    setHistory([]);
    goToStep(0);
  }

  const trainHelp = canTrain
    ? null
    : isFreePlay
      ? t('digitalWorld.trainModel.trainHelpEmpty')
      : t('digitalWorld.trainModel.trainHelpSort', { count: unsorted.length });
  const trainLabel = round && round.addExamples.length === 0 ? t('digitalWorld.trainModel.testNewPlant') : t('digitalWorld.trainModel.train');

  return (
    <div className="tw-dw-tm">
      <nav aria-label={t('digitalWorld.trainModel.roundsLabel')}>
        <ol className="tw-dw-tm-steps" role="list">
          {stepTitles.map((title, index) => (
            <li key={index}>
              <button type="button" className="tw-dw-tm-step" aria-current={index === step ? 'step' : undefined} onClick={() => goToStep(index)}>
                <span className="tw-dw-tm-step-num" aria-hidden="true">
                  {index + 1}
                </span>
                <span {...(index < freePlay ? contentLang : {})}>{title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className="tw-dw-tm-panel" aria-labelledby="tw-dw-tm-step-title">
        <p className="eyebrow tw-dw-muted">{t('digitalWorld.trainModel.stepOf', { n: step + 1, total: stepTitles.length })}</p>
        <h4 id="tw-dw-tm-step-title" className="h3" tabIndex={-1} {...(isFreePlay ? {} : contentLang)}>
          {stepTitles[step]}
        </h4>
        <TaskCard>
          {isFreePlay
            ? t('digitalWorld.trainModel.freePlayIntro')
            : addedThisStep > 0
              ? t('digitalWorld.trainModel.newExamples', { count: addedThisStep })
              : t('digitalWorld.trainModel.noNewExamples')}
        </TaskCard>

        {unsorted.length > 0 ? (
          <CardGroup
            id="unsorted"
            title={isFreePlay ? t('digitalWorld.trainModel.notUsedTitle') : t('digitalWorld.trainModel.toSortTitle')}
            help={isFreePlay ? t('digitalWorld.trainModel.notUsedHelp') : t('digitalWorld.trainModel.toSortHelp')}
            cards={unsorted}
            labels={labels}
            activity={activity}
            onLabel={setLabel}
            canTakeOut={false}
          />
        ) : null}

        <div className="tw-dw-tm-groups">
          {activity.labels.map((label) => (
            <CardGroup
              key={label.id}
              id={label.id}
              title={t('digitalWorld.trainModel.groupTitle', { label: label.label })}
              cards={labelled.filter((card) => labels[card.id] === label.id)}
              labels={labels}
              activity={activity}
              onLabel={setLabel}
              canTakeOut={isFreePlay}
              showCount
            />
          ))}
        </div>

        {trained ? null : (
          <div className="tw-dw-actions">
            <Button size="lg" icon="Sprout" disabled={!canTrain} aria-describedby={trainHelp ? 'tw-dw-tm-train-help' : undefined} onClick={trainAndTest}>
              {trainLabel}
            </Button>
            {trainHelp ? (
              <p id="tw-dw-tm-train-help" className="small tw-dw-muted">
                {trainHelp}
              </p>
            ) : changed ? (
              <p className="small tw-dw-muted">{t('digitalWorld.trainModel.changed')}</p>
            ) : null}
          </div>
        )}

        {trained ? <Results activity={activity} trained={trained} allExamples={allExamples} /> : null}

        {trained && step < freePlay ? (
          <div className="tw-dw-actions">
            <Button size="lg" iconRight="ArrowRight" onClick={() => goToStep(step + 1)}>
              {t('digitalWorld.trainModel.next', { title: stepTitles[step + 1] ?? '' })}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="tw-dw-tm-panel" aria-labelledby="tw-dw-tm-history-title">
        <h4 id="tw-dw-tm-history-title" className="h3">
          {t('digitalWorld.trainModel.historyTitle')}
        </h4>
        {history.length === 0 ? (
          <p className="body tw-dw-muted">{t('digitalWorld.trainModel.historyNone')}</p>
        ) : (
          <ol className="tw-dw-tm-history" role="list" data-testid="tw-dw-tm-history">
            {history.map((row) => (
              <li key={row.key}>
                <span>{row.title}</span>
                <b>{t('digitalWorld.trainModel.historyScore', { right: row.right, of: row.of })}</b>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="tw-dw-tm-panel" aria-labelledby="tw-dw-tm-how-title">
        <h4 id="tw-dw-tm-how-title" className="h3">
          {t('digitalWorld.trainModel.howTitle')}
        </h4>
        <HowItWorks />
        <div className="tw-dw-actions">
          <Button variant="secondary" icon="RotateCcw" onClick={startAgain}>
            {t('digitalWorld.trainModel.startAgain')}
          </Button>
        </div>
      </section>

      <div className="tw-visually-hidden" role="status" aria-live="polite" data-testid="tw-dw-tm-announcer">
        {announcement}
      </div>
    </div>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  return (
    <ol className="body tw-dw-tm-how">
      <li>{t('digitalWorld.trainModel.how1')}</li>
      <li>{t('digitalWorld.trainModel.how2')}</li>
      <li>{t('digitalWorld.trainModel.how3')}</li>
    </ol>
  );
}

interface CardGroupProps {
  id: string;
  title: string;
  help?: string;
  cards: readonly LeafCardData[];
  labels: Labels;
  activity: TrainModelActivity;
  onLabel: (card: LeafCardData, label: string | null) => void;
  canTakeOut: boolean;
  showCount?: boolean;
}

function CardGroup({ id, title, help, cards, labels, activity, onLabel, canTakeOut, showCount }: CardGroupProps) {
  const { t } = useI18n();
  const headingId = `tw-dw-tm-group-${id}`;
  return (
    <section className="tw-dw-tm-group" data-group={id} aria-labelledby={headingId}>
      <div className="tw-dw-tm-group-head">
        <h5 id={headingId} className="h3">
          {title}
        </h5>
        {showCount ? <Badge tone="outline">{t('digitalWorld.trainModel.groupCount', { count: cards.length })}</Badge> : null}
      </div>
      {help ? <p className="small tw-dw-muted">{help}</p> : null}
      {cards.length === 0 ? (
        <p className="body tw-dw-muted">{t('digitalWorld.trainModel.groupEmpty')}</p>
      ) : (
        <ul className="tw-dw-tm-cards" role="list">
          {cards.map((card) => (
            <li key={card.id}>
              <ExampleCard card={card} label={labels[card.id] ?? null} activity={activity} onLabel={onLabel} canTakeOut={canTakeOut} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ExampleCardProps {
  card: LeafCardData;
  label: string | null;
  activity: TrainModelActivity;
  onLabel: (card: LeafCardData, label: string | null) => void;
  canTakeOut: boolean;
}

function ExampleCard({ card, label, activity, onLabel, canTakeOut }: ExampleCardProps) {
  const { t, contentLang } = useI18n();
  return (
    <article className="tw-dw-tm-card" data-card-id={card.id} aria-label={card.description}>
      <div className="tw-dw-tm-card-top">
        <LeafPicture card={card} />
        <p className="label" {...contentLang}>
          {card.description}
        </p>
      </div>
      <SegmentedControl
        label={t('digitalWorld.trainModel.labelFor', { description: card.description })}
        options={activity.labels.map((l) => ({ label: l.label, value: l.id }))}
        value={label ?? undefined}
        onChange={(value) => onLabel(card, value)}
      />
      {canTakeOut && label ? (
        <Button variant="ghost" icon="X" aria-label={t('digitalWorld.trainModel.takeOutFor', { description: card.description })} onClick={() => onLabel(card, null)}>
          {t('digitalWorld.trainModel.takeOut')}
        </Button>
      ) : null}
      <Numbers card={card} activity={activity} />
    </article>
  );
}

/** What the model sees: the card's numbers, each with its feature's name and scale. */
function Numbers({ card, activity }: { card: LeafCardData; activity: TrainModelActivity }) {
  const { t, contentLang } = useI18n();
  return (
    <details className="tw-dw-tm-numbers">
      <summary className="small">{t('digitalWorld.trainModel.numbersSummary')}</summary>
      <p className="small">{t('digitalWorld.trainModel.numbersIntro', { count: activity.features.length })}</p>
      <dl className="small" {...contentLang}>
        {activity.features.map((feature, index) => (
          <div key={feature.id}>
            <dt>{feature.label}</dt>
            <dd>
              <b>{card.features[index]}</b> <span className="tw-dw-muted">{feature.scale}</span>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function Results({ activity, trained, allExamples }: { activity: TrainModelActivity; trained: Trained; allExamples: readonly LeafCardData[] }) {
  const { t, tx, contentLang } = useI18n();
  const { run, exampleCount, debrief, differ } = trained;
  const labelText = new Map(activity.labels.map((label) => [label.id, label.label]));
  const testById = new Map(activity.tests.map((card) => [card.id, card]));
  return (
    <section className="tw-dw-tm-results" aria-labelledby="tw-dw-tm-results-title">
      <h5 id="tw-dw-tm-results-title" className="h3" tabIndex={-1}>
        {t('digitalWorld.trainModel.resultsTitle')}
      </h5>
      <p className="body-lg" data-testid="tw-dw-tm-score">
        <strong>{t('digitalWorld.trainModel.score', { right: run.right, of: run.of })}</strong>
      </p>
      <p className="body">{t('digitalWorld.trainModel.learnedFrom', { count: exampleCount })}</p>
      {differ ? <p className="body-lg tw-dw-measure">{t('digitalWorld.trainModel.yourLabelsDiffer')}</p> : null}
      {debrief ? (
        <p className="body-lg tw-dw-measure" {...contentLang}>
          {debrief}
        </p>
      ) : null}
      <ul className="tw-dw-tm-guesses" role="list">
        {run.results.map((result) => {
          const card = testById.get(result.card.id);
          if (!card) return null;
          const nearest = allExamples.find((example) => example.id === result.guess.nearest.id);
          const said = <span {...contentLang}>{labelText.get(result.guess.label) ?? result.guess.label}</span>;
          return (
            <li key={card.id}>
              <article className="tw-dw-tm-guess" data-right={result.right} aria-label={card.description}>
                <div className="tw-dw-tm-card-top">
                  <LeafPicture card={card} />
                  <div className="tw-dw-tm-guess-text">
                    <p className="label" {...contentLang}>
                      {card.description}
                    </p>
                    <Badge tone={result.right ? 'correct' : 'retry'} icon={result.right ? 'Check' : 'RotateCcw'}>
                      {result.right ? t('digitalWorld.trainModel.right') : t('digitalWorld.trainModel.notQuite')}
                    </Badge>
                  </div>
                </div>
                <dl className="tw-dw-tm-says body">
                  <div>
                    <dt>{t('digitalWorld.trainModel.modelSaid')}</dt>
                    <dd>{said}</dd>
                  </div>
                  <div>
                    <dt>{t('digitalWorld.trainModel.gardenerSays')}</dt>
                    <dd {...contentLang}>{labelText.get(card.gardenerSays) ?? card.gardenerSays}</dd>
                  </div>
                </dl>
                {nearest ? (
                  <div className="tw-dw-tm-nearest">
                    <LeafPicture card={nearest} size={56} />
                    <p className="small">
                      <span className="tw-dw-tm-nearest-name" {...contentLang}>
                        {nearest.description}
                      </span>
                      <span>{tx('digitalWorld.trainModel.lookedLike', { label: said })}</span>
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

/**
 * On paper: the example and test cards with their numbers, and the rounds,
 * so a class can run it with cards. For teachers, the gardener's labels and
 * what the model gets each round when labelled like the gardener.
 */
export function TrainModelOnPaper({ activity, forTeachers }: { activity: TrainModelActivity; forTeachers: boolean }) {
  const { t, contentLang: en } = useI18n();
  const labelText = new Map(activity.labels.map((label) => [label.id, label.label]));
  const cards = (title: string, list: readonly LeafCardData[]) => (
    <div className="tw-print-keep">
      <h4>{title}</h4>
      <table className="tw-dw-paper-table">
        <thead>
          <tr>
            <th scope="col">{t('digitalWorld.trainModel.paperCard')}</th>
            {activity.features.map((feature) => (
              <th key={feature.id} scope="col" {...en}>
                {feature.label}
              </th>
            ))}
            <th scope="col">{forTeachers ? t('digitalWorld.trainModel.gardenerSays') : t('digitalWorld.trainModel.paperYourLabel')}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((card) => (
            <tr key={card.id}>
              <th scope="row" {...en}>
                {card.description}
              </th>
              {card.features.map((value, index) => (
                <td key={index}>{value}</td>
              ))}
              <td {...en}>{forTeachers ? labelText.get(card.gardenerSays) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <>
      <h4>{t('digitalWorld.trainModel.howTitle')}</h4>
      <HowItWorks />
      <dl className="tw-dw-paper-scales" {...en}>
        {activity.features.map((feature) => (
          <div key={feature.id}>
            <dt>{feature.label}</dt>
            <dd>{feature.scale}</dd>
          </div>
        ))}
      </dl>
      {cards(t('digitalWorld.trainModel.paperExamples'), activity.examples)}
      {cards(t('digitalWorld.trainModel.paperTests'), activity.tests)}
      <h4>{t('digitalWorld.trainModel.roundsLabel')}</h4>
      <ol>
        {activity.rounds.map((round) => (
          <li key={round.id} className="tw-print-keep">
            <p>
              <strong {...en}>{round.title}</strong>
            </p>
            {forTeachers ? (
              <>
                <p>
                  {t('digitalWorld.trainModel.paperExpected', {
                    right: round.expectedIfLabelledLikeTheGardener.right,
                    of: round.expectedIfLabelledLikeTheGardener.of,
                  })}
                </p>
                <p {...en}>{round.debrief}</p>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </>
  );
}
