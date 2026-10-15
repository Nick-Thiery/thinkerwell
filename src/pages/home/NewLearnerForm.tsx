import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { LanguageChoice, useHasLanguageChoice } from '../../app/LanguageChoice';
import { useLearnerSession } from '../../session';
import { lessonPath } from '../../app/lessonUrls';
import type { LessonSummary } from '../../content/catalog';
import { Button, Icon, TextField } from '../../components/ds';
import { En, useI18n } from '../../i18n';
import { useMeasurementState } from '../../measurement/track';
import type { LearnerColour, NewLearner } from '../../storage';
import { ColourPicker } from './ColourPicker';
import { HomeHero } from './HomeHero';
// The folded options' look, shared with the lessons' LessonDisclosure.
import '../lesson/LessonDisclosure.css';

/** Id of the name field, so a caller can move focus to it when this form appears. */
export const NEW_LEARNER_NAME_FIELD_ID = 'home-new-learner-name';
const CLASS_CODE_FIELD_ID = 'home-new-learner-classcode';
const MAX_NAME_LENGTH = 30;
const CLASS_CODE_PATTERN = /^[A-Za-z0-9-]+$/;
// Not a section tint (history/geography/civics): a learner who never opens
// the colour picker would otherwise get a section-coloured avatar by
// default on every device, which is the one part of "section colours only
// in section places" this five-colour list can still keep even though the
// list itself is a deliberate, narrow, RECORDED exception to that rule
// (docs/PRODUCT.md's phase-3 decision, still open for Justin and Nick to
// confirm, r2-rules-3 / r3-rules-1). Not lemon either: lemon is already the
// header, current step and continue-card colour, so defaulting every new
// learner's avatar to it would add a sixth, unbudgeted use on the very
// first screen they see. Paper (white, ink border) is the one colour on the
// list that is neither.
const DEFAULT_COLOUR: LearnerColour = 'paper';

export interface NewLearnerFormProps {
  /** LessonSummary 1, shown in the hero pane and used to label the submit button's target. */
  lesson1: LessonSummary;
  onBack: () => void;
  /** Resolves with where to go next, when it isn't Lesson 1 (back to a guest's work). */
  onSubmit: (input: NewLearner) => Promise<string | null | void>;
  /** The lesson a guest's work is being saved from ("Save my work"), which Start goes back to. */
  savingFrom?: number | null;
}

/** One optional part of the form, folded until wanted: a native details element (keyboard and screen readers need nothing more). */
function FormOption({ summary, forceOpen = false, children }: { summary: string; forceOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="tw-fold tw-home-option"
      open={open || forceOpen}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="tw-fold-summary">
        <Icon name="ChevronDown" size={20} className="tw-fold-chevron" />
        <span>{summary}</span>
      </summary>
      <div className="tw-fold-body">{children}</div>
    </details>
  );
}

/**
 * The "who's learning" panel swapped for a form (NewLearner.dc.html): first
 * name or nickname and Start, then, folded under Start because none of them
 * is needed (docs/notes/simpler-lessons.md), a colour, the language and an
 * optional class code. The language is the app's one language setting, so
 * choosing one changes the page at once (saved for the device, as nobody is
 * chosen yet), and the new learner keeps the language on screen; it starts
 * as the language already on screen.
 */
export function NewLearnerForm({ lesson1, onBack, onSubmit, savingFrom = null }: NewLearnerFormProps) {
  const { t, tx } = useI18n();
  const hasLanguageChoice = useHasLanguageChoice();
  const languageHelpId = useId();
  const { language, setLanguage } = useLearnerSession();
  // While this device shares pilot results, the line under the form says so (src/measurement/gate.ts).
  const sharing = useMeasurementState().org !== null;
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [colour, setColour] = useState<LearnerColour>(DEFAULT_COLOUR);
  const [classCode, setClassCode] = useState('');
  const [classCodeError, setClassCodeError] = useState<string | undefined>(undefined);
  const [submitError, setSubmitError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('pages.home.newLearner.nameRequired'));
      document.getElementById(NEW_LEARNER_NAME_FIELD_ID)?.focus();
      return;
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setNameError(t('pages.home.newLearner.nameTooLong'));
      document.getElementById(NEW_LEARNER_NAME_FIELD_ID)?.focus();
      return;
    }
    const trimmedCode = classCode.trim();
    if (trimmedCode && !CLASS_CODE_PATTERN.test(trimmedCode)) {
      setClassCodeError(t('pages.home.newLearner.classCodeInvalid'));
      // Once "Have a class code?" has opened for the error (it may have been folded away).
      requestAnimationFrame(() => document.getElementById(CLASS_CODE_FIELD_ID)?.focus());
      return;
    }
    setNameError(undefined);
    setClassCodeError(undefined);
    setSubmitError(false);
    setSubmitting(true);
    const input: NewLearner = { name: trimmedName, colour };
    if (trimmedCode) input.classCode = trimmedCode.toUpperCase();
    // Theirs from now on: the language on screen as they join.
    input.language = language;
    void onSubmit(input)
      .then((next) => {
        // "Start Lesson 1": actually takes the new learner straight there,
        // rather than leaving them on a dashboard the button never mentioned;
        // or back to the work they asked to save, on the same step.
        void navigate(next ?? lessonPath(lesson1.id, 'read'));
      })
      .catch(() => {
        setSubmitting(false);
        setSubmitError(true);
      });
  }

  return (
    <>
      <HomeHero size={150}>
        <div className="tw-home-starts-with">
          <span className="eyebrow">{t('pages.home.newLearner.startsWith')}</span>
          <span className="tw-home-starts-with-lesson">
            {tx('pages.home.newLearner.startsWithLesson', { number: lesson1.number, title: <En>{lesson1.title}</En> })}
          </span>
          <p className="body">{t('pages.home.newLearner.startsWithNote')}</p>
        </div>
      </HomeHero>
      <section aria-labelledby="home-panel-title" className="tw-home-panel">
        <div className="tw-home-panel-head">
          <Button variant="ghost" icon="ArrowLeft" onClick={onBack}>
            {t('pages.home.newLearner.back')}
          </Button>
        </div>
        <div className="tw-home-panel-intro">
          <span className="eyebrow">{t('pages.home.newLearner.eyebrow')}</span>
          <h1 id="home-panel-title" className="h1" tabIndex={-1}>
            {t('pages.home.newLearner.title')}
          </h1>
        </div>
        <form className="tw-home-form" onSubmit={handleSubmit} noValidate>
          <TextField
            id={NEW_LEARNER_NAME_FIELD_ID}
            label={t('pages.home.newLearner.nameLabel')}
            helper={nameError ?? t('pages.home.newLearner.nameHelper')}
            invalid={Boolean(nameError)}
            value={name}
            onValueChange={(value) => {
              setName(value);
              if (nameError) setNameError(undefined);
            }}
            maxLength={200}
          />
          {submitError ? (
            <p className="body tw-home-form-error" role="alert">
              {/* Ink text, not burnt orange: this sits straight on the
                  lavender panel, where --retry text fails WCAG 1.4.3
                  (r2-rules-1). The icon alone carries the "not quite"
                  colour, at the 3:1 graphics are held to. */}
              <Icon name="RotateCcw" size={16} strokeWidth={3} className="tw-home-form-error-icon" />
              {t('pages.home.newLearner.submitError')}
            </p>
          ) : null}
          <Button type="submit" variant="primary" size="lg" block iconRight="ArrowRight" disabled={submitting}>
            {savingFrom === null
              ? t('pages.home.newLearner.submit')
              : t('pages.home.newLearner.submitSaving', { number: savingFrom })}
          </Button>
          {/* The rest is optional, so it waits folded under Start (docs/notes/simpler-lessons.md). */}
          <div className="tw-home-more">
            <FormOption summary={t('pages.home.newLearner.colourSummary')}>
              <ColourPicker value={colour} onChange={setColour} legend={t('pages.home.newLearner.colourLabel')} />
            </FormOption>
            {hasLanguageChoice ? (
              <FormOption summary={t('pages.home.newLearner.languageSummary')}>
                <fieldset className="tw-colour-fieldset">
                  <legend className="label">{t('pages.home.newLearner.languageLabel')}</legend>
                  <LanguageChoice
                    label={t('pages.home.newLearner.languageLabel')}
                    describedBy={languageHelpId}
                    value={language}
                    onChange={(code) => {
                      setLanguage(code).catch((error: unknown) => {
                        if (import.meta.env.DEV) console.error(error);
                      });
                    }}
                  />
                  <p id={languageHelpId} className="small tw-home-language-help">
                    {t('pages.home.newLearner.languageHelper')}
                  </p>
                </fieldset>
              </FormOption>
            ) : null}
            {/* Open whenever the code has something to say (an error), so a learner always sees why Start didn't go. */}
            <FormOption summary={t('pages.home.newLearner.classCodeSummary')} forceOpen={Boolean(classCodeError)}>
              <TextField
                id={CLASS_CODE_FIELD_ID}
                label={t('pages.home.newLearner.classCodeLabel')}
                optional
                placeholder={t('pages.home.newLearner.classCodePlaceholder')}
                helper={classCodeError ?? t('pages.home.newLearner.classCodeHelper')}
                invalid={Boolean(classCodeError)}
                value={classCode}
                onValueChange={(value) => {
                  setClassCode(value);
                  if (classCodeError) setClassCodeError(undefined);
                }}
              />
            </FormOption>
          </div>
        </form>
        <span className="tw-home-lock-note small">
          <Icon name="Lock" size={16} />{' '}
          {t(sharing ? 'pages.home.newLearner.privacyNotePilot' : 'pages.home.newLearner.privacyNote')}
        </span>
      </section>
    </>
  );
}
