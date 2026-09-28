import { useEffect, useRef, useState } from 'react';
import { getLessons, type Lesson } from '../../content';
import { Button, Icon, LearnerTile } from '../../components/ds';
import { useI18n } from '../../i18n';
import { addedOn, learnersWithSameName } from '../../session';
import { findContinueTarget, getStore, progressByLessonId, type Learner, type NewLearner } from '../../storage';
import { HomeHero, HomeHeroStages } from './HomeHero';
import { NEW_LEARNER_NAME_FIELD_ID, NewLearnerForm } from './NewLearnerForm';

type PickerView = { kind: 'grid' } | { kind: 'new' } | { kind: 'confirmRemove'; learnerId: string };

export interface WhoIsLearningPickerProps {
  learners: Learner[];
  lesson1: Lesson;
  onChoose: (id: string) => void;
  onAdd: (input: NewLearner) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onLookAround: () => void;
  /** 'new' opens straight on the new-learner form (an old Base44 educator link, or the header switcher's "I'm new here"). */
  initialView?: 'new';
}

/**
 * Home with no learner chosen (Main.dc.html / PhoneHome.dc.html): the hero
 * pane, and the lavender "who's learning" panel, which swaps in place for
 * adding a learner or confirming a removal — never a new page.
 */
export function WhoIsLearningPicker({ learners, lesson1, onChoose, onAdd, onRemove, onLookAround, initialView }: WhoIsLearningPickerProps) {
  const { t, formatDate } = useI18n();
  const [view, setView] = useState<PickerView>(initialView === 'new' ? { kind: 'new' } : { kind: 'grid' });
  const [tileMeta, setTileMeta] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const confirmHeadingRef = useRef<HTMLHeadingElement>(null);
  const confirmRootRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Loads each learner's continue target once the picker shows, for the
  // tiles' "Up to Lesson N" meta text — the exact same lookup
  // (findContinueTarget over every saved lesson) the dashboard uses, so a
  // tile never names a different lesson than that learner's own dashboard
  // does once chosen. Fails soft: a learner whose lookup errors just shows
  // "Not started yet" like one with no progress at all.
  useEffect(() => {
    if (view.kind !== 'grid' || learners.length === 0) return;
    let cancelled = false;
    const lessons = getLessons();
    void (async () => {
      const entries = await Promise.all(
        learners.map(async (learner): Promise<[string, string]> => {
          try {
            const store = await getStore();
            const records = await store.listProgress(learner.id);
            const target = findContinueTarget(lessons, progressByLessonId(records));
            // No target at all (nothing saved) shows "Not started yet";
            // every lesson finished (no target either, but records exist)
            // shows the last lesson rather than nothing.
            const number = records.length === 0 ? undefined : (target?.lesson.number ?? lessons[lessons.length - 1]?.number);
            return [learner.id, number ? t('pages.home.tileMeta', { number }) : t('pages.home.tileMetaNone')];
          } catch {
            return [learner.id, t('pages.home.tileMetaNone')];
          }
        }),
      );
      if (!cancelled) setTileMeta(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [learners, view.kind, t]);

  // Moves focus to match each in-page view change (not the very first render:
  // AppLayout already lands focus on the h1 once it first appears).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setRemoveError(false);
    if (view.kind === 'grid') headingRef.current?.focus();
    else if (view.kind === 'new') document.getElementById(NEW_LEARNER_NAME_FIELD_ID)?.focus();
    else confirmHeadingRef.current?.focus();
  }, [view]);

  // Every other panel in the app closes on Escape; the inline "Remove
  // learner?" confirmation is not a modal (nothing traps focus in it), but it
  // should behave the same way as "Keep {name}".
  useEffect(() => {
    if (view.kind !== 'confirmRemove') return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setView({ kind: 'grid' });
      }
    }
    const root = confirmRootRef.current;
    root?.addEventListener('keydown', handleKeyDown);
    return () => root?.removeEventListener('keydown', handleKeyDown);
  }, [view.kind]);

  if (view.kind === 'new') {
    return (
      <NewLearnerForm
        lesson1={lesson1}
        onBack={() => setView({ kind: 'grid' })}
        onSubmit={async (input) => {
          await onAdd(input);
        }}
      />
    );
  }

  const removingLearner = view.kind === 'confirmRemove' ? learners.find((l) => l.id === view.learnerId) : undefined;
  // Two learners with the same name: their tiles also say when each was added.
  const sameName = learnersWithSameName(learners);
  const metaFor = (learner: Learner): string | undefined => {
    const meta = tileMeta[learner.id];
    const date = sameName.has(learner.id) ? addedOn(learner, formatDate) : '';
    if (!date) return meta;
    return meta ? t('pages.home.tileMetaAdded', { meta, date }) : t('pages.home.tileAdded', { date });
  };

  return (
    <>
      <HomeHero>
        <HomeHeroStages />
      </HomeHero>
      {/* A section, not an aside: this panel (with the page's one h1 inside
          it) is the picker's main task, not complementary content. */}
      <section aria-labelledby="home-panel-title" className="tw-home-panel">
        <div className="tw-home-panel-intro">
          <span className="eyebrow">{t('pages.home.onThisDevice')}</span>
          <h1 id="home-panel-title" className="h1" tabIndex={-1} ref={headingRef}>
            {t('pages.home.title')}
          </h1>
          <p className="body">{t('pages.home.subtitle')}</p>
        </div>
        {removingLearner ? (
          <div className="tw-home-confirm" ref={confirmRootRef}>
            <h2 className="h3" tabIndex={-1} ref={confirmHeadingRef}>
              {t('pages.home.remove.confirmTitle', { name: removingLearner.name })}
            </h2>
            <p className="body">{t('pages.home.remove.confirmBody', { name: removingLearner.name })}</p>
            {removeError ? (
              <p className="body tw-home-confirm-error" role="alert">
                {t('pages.home.remove.error')}
              </p>
            ) : null}
            <div className="tw-home-confirm-actions">
              <Button
                variant="primary"
                onClick={() => setView({ kind: 'grid' })}
                disabled={removing}
              >
                {t('pages.home.remove.cancel', { name: removingLearner.name })}
              </Button>
              <Button
                variant="secondary"
                disabled={removing}
                onClick={() => {
                  setRemoving(true);
                  setRemoveError(false);
                  void onRemove(removingLearner.id)
                    .then(() => setView({ kind: 'grid' }))
                    .catch(() => setRemoveError(true))
                    .finally(() => setRemoving(false));
                }}
              >
                {t('pages.home.remove.confirm', { name: removingLearner.name })}
              </Button>
            </div>
          </div>
        ) : (
          <div className="tw-home-tiles">
            {learners.map((learner) => (
              <LearnerTile
                key={learner.id}
                name={learner.name}
                tone={learner.colour}
                meta={metaFor(learner)}
                onClick={() => onChoose(learner.id)}
                onRemove={() => setView({ kind: 'confirmRemove', learnerId: learner.id })}
                removeLabel={t('pages.home.remove.label', { name: learner.name })}
              />
            ))}
            <LearnerTile variant="new" name={t('pages.home.newLearnerTile')} onClick={() => setView({ kind: 'new' })} />
          </div>
        )}
        {!removingLearner ? (
          <div className="tw-home-lookaround">
            <Button variant="ghost" icon="Eye" onClick={onLookAround}>
              {t('pages.home.lookAround')}
            </Button>
            <span className="tw-home-lock-note small">
              <Icon name="Lock" size={16} /> {t('pages.home.lookAroundNote')}
            </span>
          </div>
        ) : null}
      </section>
    </>
  );
}
