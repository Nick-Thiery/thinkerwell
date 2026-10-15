/**
 * Write: the lesson's writing task (docs/screens/LessonWrite.dc.html at 1280,
 * PhoneLesson.dc.html at 390). Every lesson string comes from `lesson.write`.
 *
 * The task, then the writing box, then Continue: the help is there when it is
 * wanted, folded away until then (docs/notes/simpler-lessons.md).
 * - "Look at the evidence again" (or the map) opens the evidence above the box.
 * - "Need help writing?" holds the sentence starters and the planning boxes;
 *   it starts open when the learner has planned before.
 * - Sentence starters go in at the caret and never replace what the learner
 *   wrote (./insertStarter.ts). Focus goes back to the writing box.
 * - Planning boxes, the writing box and the self-check save to
 *   progress.writing through the lesson player (typing after a pause,
 *   ticks at once). Guests keep them in memory only.
 * - The writing box has "Say it" where speech can be turned into text on
 *   the device (../sayIt.tsx). Dictated words go in at the caret like a
 *   starter, and are saved like typing.
 * - The example answer shows only after the learner has written something or
 *   asks to see one (CLAUDE.md), and stays open once shown (exampleShown).
 * - "Check your answer" (the self-check) is folded away too, open once
 *   anything in it is ticked. None of the help is ever needed to continue.
 * - Continue marks Write done only when the writing box has text
 *   (src/lesson/progressRules.ts); it never blocks.
 */
import { useCallback, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Button, Chip, Icon, TaskCard, WritingBox } from '../../../components/ds';
import { En, useI18n } from '../../../i18n';
import { hasText, useLessonPlayer } from '../../../lesson';
import { LessonSlot } from '../../../lesson/extras';
import type { LessonProgress, WritingProgress } from '../../../storage';
import { LessonEvidence } from '../evidence/LessonEvidence';
import { LessonDisclosure } from '../LessonDisclosure';
import { SayItBox, useSayIt } from '../sayIt';
import { StageActionBar } from '../StageActionBar';
import { insertStarter } from './insertStarter';
import './WriteStage.css';

function withWriting(change: (writing: WritingProgress) => WritingProgress) {
  return (progress: LessonProgress): LessonProgress => ({ ...progress, writing: change(progress.writing) });
}

export function WriteStage() {
  const { t, contentLang } = useI18n();
  const { lesson, progress, update, stageEvent } = useLessonPlayer();
  const write = lesson.write;
  const writing = progress.writing;

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const sayIt = useSayIt();

  const answerId = `write-answer-${lesson.id}`;
  const evidenceId = `write-evidence-${lesson.id}`;
  const startersTitleId = `write-starters-${lesson.id}`;
  const planTitleId = `write-plan-${lesson.id}`;

  // The learner's last caret (the end of their selection) in the writing box.
  // null until they have been in the box: a starter then goes at the end.
  const caret = useRef<number | null>(null);
  // Where to put the caret once an inserted starter has rendered.
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  const rememberCaret = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    caret.current = event.currentTarget.selectionEnd;
  };
  // After Say it puts words in, a starter goes after them.
  const rememberDictatedCaret = useCallback((at: number) => {
    caret.current = at;
  }, []);

  const getAnswerBox = () => document.getElementById(answerId) as HTMLTextAreaElement | null;

  const addStarter = (starter: string) => {
    const box = getAnswerBox();
    const current = box ? box.value : writing.text;
    const result = insertStarter(current, starter, caret.current);
    pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd };
    caret.current = result.selectionEnd;
    update(withWriting((w) => ({ ...w, text: result.text })));
  };

  // After a starter is added, put focus back in the box with the caret after
  // the new words (or the first blank selected, so typing fills it in).
  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    if (!selection) return;
    pendingSelection.current = null;
    const box = getAnswerBox();
    if (!box) return;
    box.focus();
    box.setSelectionRange(selection.start, selection.end);
    // getAnswerBox reads a stable id; the effect only needs to run when the text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writing.text]);

  const showExample = () => {
    if (!writing.exampleShown) update(withWriting((w) => ({ ...w, exampleShown: true })), { immediate: true });
  };

  // Whether work is saved is said once, in the lesson's head (LessonPage), not here.
  const helper = t(sayIt.available ? 'lessonPlayer.write.helperSayIt' : 'lessonPlayer.write.helper');

  const onlyMaps = lesson.evidence.cards.every((card) => card.type === 'map');
  const planned = Object.values(writing.planning).some((text) => hasText(text));
  const ticked = Object.values(writing.selfCheck).some(Boolean);

  return (
    <>
      {/* A course's own activity, where its lesson file puts it (src/lesson/extras.tsx); nothing in Our World. */}
      <LessonSlot name="write:before-prompt" />
      <TaskCard>
        <En>{write.prompt}</En>
      </TaskCard>

      <div className="tw-write-tools">
        <Button
          variant="ghost"
          icon={onlyMaps ? 'Map' : 'FileText'}
          aria-expanded={evidenceOpen}
          aria-controls={evidenceOpen ? evidenceId : undefined}
          onClick={() => setEvidenceOpen((open) => !open)}
        >
          {onlyMaps ? t('lessonPlayer.write.mapToggle') : t('lessonPlayer.write.evidenceToggle')}
        </Button>
      </div>

      {evidenceOpen ? (
        <div id={evidenceId} className="tw-write-evidence">
          <LessonEvidence evidence={lesson.evidence} visual={lesson.visual} />
        </div>
      ) : null}

      <SayItBox
        sayIt={sayIt}
        id={answerId}
        label={t('lessonPlayer.write.answerLabel')}
        rows={6}
        value={writing.text}
        helper={helper}
        onValueChange={(value) => update(withWriting((w) => ({ ...w, text: value })))}
        onDictatedCaret={rememberDictatedCaret}
        onSelect={rememberCaret}
        onKeyUp={rememberCaret}
        onClick={rememberCaret}
        onBlur={rememberCaret}
      />

      <LessonDisclosure className="tw-write-help" icon="Lightbulb" summary={t('lessonPlayer.write.needHelp')} defaultOpen={planned}>
        <section className="tw-write-starters" aria-labelledby={startersTitleId}>
          <h3 id={startersTitleId} className="tw-write-help-title">
            {t('lessonPlayer.write.modeStarters')}
          </h3>
          <p className="tw-write-help-intro">{t('lessonPlayer.write.startersTitle')}</p>
          <div className="tw-write-chips">
            {write.sentenceStarters.map((starter, index) => (
              <Chip key={index} variant="starter" icon="Plus" onClick={() => addStarter(starter)} {...contentLang}>
                {starter}
              </Chip>
            ))}
          </div>
        </section>

        <section className="tw-write-plan" aria-labelledby={planTitleId}>
          <h3 id={planTitleId} className="tw-write-help-title">
            {t('lessonPlayer.write.modePlan')}
          </h3>
          <p className="tw-write-help-intro">{t('lessonPlayer.write.planIntro')}</p>
          <div className="tw-write-plan-boxes">
            {write.planningBoxes.map((title, index) => (
              <WritingBox
                key={index}
                id={`write-plan-${lesson.id}-${index}`}
                label={<En>{title}</En>}
                optional
                rows={3}
                value={writing.planning[index] ?? ''}
                onValueChange={(value) =>
                  update(withWriting((w) => ({ ...w, planning: { ...w.planning, [index]: value } })))
                }
              />
            ))}
          </div>
        </section>
      </LessonDisclosure>

      <ExampleAnswer
        example={write.example}
        written={hasText(writing.text)}
        shown={writing.exampleShown}
        onShow={showExample}
      />

      <LessonDisclosure className="tw-write-self-check" icon="ListChecks" summary={t('lessonPlayer.write.selfCheckTitle')} defaultOpen={ticked}>
        <fieldset className="tw-write-self-check-list">
          <legend className="tw-visually-hidden">{t('lessonPlayer.write.selfCheckTitle')}</legend>
          {write.selfCheck.map((item, index) => {
            const id = `write-check-${lesson.id}-${index}`;
            return (
              <label key={index} className="tw-write-check" htmlFor={id}>
                {/* A real checkbox covering the whole row (the tap target, at least 44px tall);
                    the 24px box beside the words is drawn by the span after it. */}
                <input
                  id={id}
                  type="checkbox"
                  className="tw-write-check-input"
                  checked={Boolean(writing.selfCheck[index])}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    update(withWriting((w) => ({ ...w, selfCheck: { ...w.selfCheck, [index]: checked } })), {
                      immediate: true,
                    });
                  }}
                />
                <span className="tw-write-check-box" aria-hidden="true">
                  <Icon name="Check" size={18} strokeWidth={3} />
                </span>
                <span {...contentLang}>{item}</span>
              </label>
            );
          })}
        </fieldset>
      </LessonDisclosure>

      {sayIt.announcer}

      <StageActionBar onNext={() => stageEvent({ stage: 'write', kind: 'continue' })} />
    </>
  );
}

interface ExampleAnswerProps {
  example: string;
  /** The writing box has text. */
  written: boolean;
  /** The example has been shown before (progress.writing.exampleShown). */
  shown: boolean;
  onShow: () => void;
}

/**
 * The example answer, shown only once the learner has written something or
 * asks to see it. Before anything is written: a "See an example answer"
 * button. Once there is writing: a disclosure, closed until opened. Once
 * shown, it stays open (also when the learner comes back); they can still
 * fold it away for now.
 */
function ExampleAnswer({ example, written, shown, onShow }: ExampleAnswerProps) {
  const { t, contentLang } = useI18n();
  const [open, setOpen] = useState(shown);
  const summaryRef = useRef<HTMLElement>(null);
  const focusSummary = useRef(false);

  // The saved flag can arrive after the first render (progress loads from storage).
  const [wasShown, setWasShown] = useState(shown);
  if (shown !== wasShown) {
    setWasShown(shown);
    if (shown) setOpen(true);
  }

  useLayoutEffect(() => {
    if (focusSummary.current && summaryRef.current) {
      focusSummary.current = false;
      summaryRef.current.focus();
    }
  });

  if (!written && !shown) {
    return (
      <div className="tw-write-example-ask">
        <Button
          variant="ghost"
          icon="Eye"
          onClick={() => {
            focusSummary.current = true;
            setOpen(true);
            onShow();
          }}
        >
          {t('lessonPlayer.write.seeExample')}
        </Button>
      </div>
    );
  }

  return (
    <details
      className="tw-write-example"
      open={open}
      onToggle={(event) => {
        const isOpen = event.currentTarget.open;
        setOpen(isOpen);
        if (isOpen) onShow();
      }}
    >
      <summary ref={summaryRef} className="tw-write-example-summary">
        <Icon name="ChevronDown" size={20} className="tw-write-example-chevron" />
        {/* "Compare with" only once there is something of the learner's to compare. */}
        <span>{t(written ? 'lessonPlayer.write.compareExample' : 'lessonPlayer.write.seeExample')}</span>
      </summary>
      <div className="tw-write-example-body">
        <span className="eyebrow tw-write-example-eyebrow">{t('lessonPlayer.write.exampleEyebrow')}</span>
        <p className="tw-write-example-text" {...contentLang}>
          {example}
        </p>
        <p className="tw-write-example-note">{t('lessonPlayer.write.exampleNote')}</p>
      </div>
    </details>
  );
}
