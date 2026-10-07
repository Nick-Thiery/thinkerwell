import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useFullPageTitle } from '../app/usePageTitle';
import { useCatalog } from '../content/useCatalog';
import { useI18n } from '../i18n';
import { GuestHome } from './home/GuestHome';
import { LearnerDashboard } from './home/LearnerDashboard';
import { NoStoragePanel } from './home/NoStoragePanel';
import { WhoIsLearningPicker } from './home/WhoIsLearningPicker';
import './HomePage.css';
import { useLearnerProgress, useLearnerSession } from '../session';

type Branch = 'loading' | 'noStorage' | 'guest' | 'dashboard' | 'picker';

/**
 * Home (/): "Who's learning today?" with no learner chosen (Main.dc.html /
 * PhoneHome.dc.html), the learner dashboard once one is (Dashboard.dc.html),
 * look-around mode, or a plain-words message when on-device storage isn't
 * available at all.
 *
 * While any relevant data is still loading, this renders nothing with a
 * heading (see the branches below): AppLayout moves focus to the first h1
 * that appears after a navigation, and a page that shows one heading and
 * then swaps to a different one would break that contract.
 */
export function HomePage() {
  const { t } = useI18n();
  const session = useLearnerSession();
  const progressLearnerId = session.status === 'ready' ? (session.activeLearner?.id ?? null) : null;
  const progressResult = useLearnerProgress(progressLearnerId);
  const catalog = useCatalog();
  const lesson1 = catalog.getLessonByNumber(1);

  // ?new=1 (from the header switcher's "I'm new here", which clears the
  // current learner and then lands here) opens the new-learner form straight
  // away instead of the plain grid.
  const location = useLocation();
  const navigate = useNavigate();
  const wantsNewLearnerForm = new URLSearchParams(location.search).get('new') === '1';

  // The session already treats "no storage" as look-around (session.lookAround
  // is forced true the moment storageAvailable is false), so it can guard
  // every write and show the header's usual look-around note straight away.
  // Home still shows its own explanation once first, though, and only moves
  // on once the learner acknowledges it here — otherwise NoStoragePanel's own
  // "Just look around" button would have nothing left to do.
  const [acknowledgedNoStorage, setAcknowledgedNoStorage] = useState(false);

  const branch: Branch =
    session.status === 'loading'
      ? 'loading'
      : !session.storageAvailable && !acknowledgedNoStorage
        ? 'noStorage'
        : session.lookAround
          ? 'guest'
          : session.activeLearner
            ? progressResult.status === 'loading'
              ? 'loading'
              : 'dashboard'
            : 'picker';

  // The "who's learning" picker is what a first visit, a search engine and a
  // link preview see, so it carries the home page's search title
  // (seo.home.title, docs/notes/seo.md); the other branches name themselves.
  const pageTitle =
    branch === 'noStorage'
      ? t('app.documentTitle', { page: t('pages.home.noStorage.title') })
      : branch === 'guest'
        ? t('app.documentTitle', { page: t('pages.home.guest.title') })
        : branch === 'dashboard' && session.activeLearner
          ? t('app.documentTitle', { page: t('pages.home.dashboard.greeting', { name: session.activeLearner.name }) })
          : t('seo.home.title');
  useFullPageTitle(pageTitle);

  // Moves focus to this branch's own h1 when the visible branch changes while
  // staying on "/" (adding a learner, switching learners, removing the
  // current one) — the same URL, so AppLayout's own navigation-focus effect
  // (which only watches for an h1 to appear after an actual route change)
  // never re-runs for these; this page has to do it itself.
  //
  // The very first piece of content this page ever shows (whichever branch
  // that turns out to be, even after a "loading" spinner) is left alone: on
  // a genuine full-page load that's the page just arriving, and on a
  // client-side navigation to "/" it's exactly what AppLayout is already
  // watching for. Only later branch changes — a learner switching, adding
  // a learner, removing the current one — are this effect's job, and each
  // one of those does need focus moved, even if it went through "loading"
  // on the way (that must NOT be treated as if it were the first ever
  // content again, or focus is silently lost to <body>).
  const containerRef = useRef<HTMLDivElement>(null);
  const previousBranch = useRef<Branch | null>(null);
  const hasShownContent = useRef(false);
  useEffect(() => {
    const previous = previousBranch.current;
    previousBranch.current = branch;
    if (branch === 'loading') return;
    if (!hasShownContent.current) {
      hasShownContent.current = true;
      return;
    }
    if (previous === branch) return;
    containerRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, [branch]);

  // Strips ?new=1 from the address bar once the picker has actually shown
  // (and, with it, opened the form: WhoIsLearningPicker's own initial state
  // reads `wantsNewLearnerForm` during this same render, before this effect
  // ever runs) — not any earlier. Clearing the current learner on the way
  // here is async (a store write): stripping the query on the very first
  // render after navigating, before that finishes, would race it and lose
  // ?new=1 while the branch is still briefly "dashboard", so the picker that
  // finally mounts once the learner is actually cleared would never see it.
  useEffect(() => {
    if (wantsNewLearnerForm && branch === 'picker') void navigate('/', { replace: true });
  }, [wantsNewLearnerForm, branch, navigate]);

  if (branch === 'loading' || !lesson1) return null;

  return (
    <div ref={containerRef} className={branch === 'picker' ? 'tw-home-root tw-home-split' : 'tw-home-root'}>
      {branch === 'noStorage' ? (
        <NoStoragePanel
          onLookAround={() => {
            session.startLookAround();
            setAcknowledgedNoStorage(true);
          }}
        />
      ) : null}
      {branch === 'guest' ? <GuestHome lesson1={lesson1} /> : null}
      {branch === 'dashboard' && session.activeLearner ? (
        <LearnerDashboard learner={session.activeLearner} progress={progressResult.progress} />
      ) : null}
      {branch === 'picker' ? (
        <WhoIsLearningPicker
          learners={session.learners}
          lesson1={lesson1}
          initialView={wantsNewLearnerForm ? 'new' : undefined}
          onChoose={(id) => {
            void session.chooseLearner(id).catch((error: unknown) => {
              if (import.meta.env.DEV) console.error(error);
            });
          }}
          onAdd={async (input) => {
            await session.addLearner(input);
          }}
          onRemove={(id) => session.removeLearner(id)}
          onLookAround={session.startLookAround}
        />
      ) : null}
    </div>
  );
}
