import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavigationType, Outlet, ScrollRestoration, useLocation, useNavigate, useNavigationType } from 'react-router';
import { DsLinkProvider, Icon, SiteHeader, StatusBanner } from '../components/ds';
import { I18nProvider, readDevDirection, readDevLocale, readyLocales, resolveLocale, useI18n, type Direction } from '../i18n';
import { ConnectionBanner, UpdateBanner } from '../offline';
import { LearnerSessionProvider, useLearnerSession } from '../session';
import './app.css';
import { LearnerSwitcher } from './LearnerSwitcher';
import { isNavLinkActive } from './internal/navActive';
import { MobileNav } from './MobileNav';
import { RouterDsLink } from './RouterDsLink';
import { useIsCompactHeader } from './useIsCompactHeader';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

/**
 * The shell around every page: on-device learner state, the language and
 * direction, the site header and learner switcher, the messages under it
 * (offline, back online, a new version, "just look around"), a skip link
 * and <main>.
 */
export function AppLayout() {
  const { search } = useLocation();
  // Dev only: ?dir=rtl forces right-to-left until ?dir=ltr (see src/i18n/direction.ts).
  const devDir = useMemo(() => readDevDirection(search), [search]);
  // Dev (and automated tests) only: ?locale=en-XA shows a test language until ?locale=en (src/i18n/devLocale.ts).
  const devLocale = useMemo(() => readDevLocale(search), [search]);
  // Old Base44 educator links use ?preview=true to browse without an account;
  // read on every navigation (not just the first), so it also works deep-linked.
  const forceLookAround = useMemo(() => new URLSearchParams(search).get('preview') === 'true', [search]);

  return (
    <LearnerSessionProvider forceLookAround={forceLookAround}>
      <LanguageForSession devLocale={devLocale} devDir={devDir}>
        <DsLinkProvider link={RouterDsLink}>
          <Shell devRtl={devDir === 'rtl'} devLocale={devLocale} />
        </DsLinkProvider>
      </LanguageForSession>
    </LearnerSessionProvider>
  );
}

/**
 * The interface language: the learner's own, else the device's (Settings),
 * else English, and only ever one learners are offered
 * (src/i18n/locales.ts). A guest, or nobody chosen (the home screen), gets
 * the device's. Switching learner switches language. The dev switch
 * (?locale=) wins over both.
 */
function LanguageForSession({ devLocale, devDir, children }: { devLocale: string | null; devDir: Direction | null; children: ReactNode }) {
  const { activeLearner, deviceLanguage } = useLearnerSession();
  const offered = useMemo(() => readyLocales(), []);
  const locale = devLocale ?? resolveLocale([activeLearner?.language, deviceLanguage], offered).code;
  return (
    <I18nProvider locale={locale} dirOverride={devDir} offered={offered}>
      {children}
    </I18nProvider>
  );
}

function Shell({ devRtl, devLocale }: { devRtl: boolean; devLocale: string | null }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const session = useLearnerSession();
  const compact = useIsCompactHeader();
  const mainRef = useRef<HTMLElement>(null);
  const lastPathname = useRef(pathname);
  // Set when a link or back navigation is heading to a page without an h1
  // yet (still reading IndexedDB), so focus lands on it once it appears.
  // Lasts one hop, and never fires for a REPLACE that isn't continuing one
  // of those (an unrelated redirect landing while this is pending).
  const focusPending = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);
  // Which pathname the switcher/menu were opened on, so a navigation closes
  // them for free (derived on every render) rather than needing its own
  // effect just to reset a boolean.
  const [switcherOpenAt, setSwitcherOpenAt] = useState<string | null>(null);
  const [mobileNavOpenAt, setMobileNavOpenAt] = useState<string | null>(null);
  const switcherOpen = switcherOpenAt === pathname;
  const mobileNavOpen = mobileNavOpenAt === pathname;
  // The chip element itself, captured straight from the click event rather
  // than read back later from document.activeElement: Safari (Mac and iPad)
  // and Firefox on Mac don't focus a button on click, so activeElement can't
  // be trusted to still be the chip by the time the switcher reads it
  // (r2-spec-2). State, not a ref, because it's read during render (to pass
  // to LearnerSwitcher below) — reading a ref's value there isn't safe.
  const [switcherTrigger, setSwitcherTrigger] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    const isReplace = navigationType === NavigationType.Replace;
    if (!isReplace) focusPending.current = true;

    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!focusPending.current) return;

    const tryFocus = (): boolean => {
      const heading = mainRef.current?.querySelector<HTMLElement>('h1');
      if (!heading) return false;
      heading.focus({ preventScroll: true });
      focusPending.current = false;
      return true;
    };
    if (tryFocus() || !mainRef.current) return;

    // Home, the dashboard and the course map read IndexedDB before they have
    // an h1 to show. Watch for it instead of giving up after one look; the
    // watch itself is dropped the moment another navigation starts (this
    // effect re-running disconnects it), so a heading that finally appears
    // after the learner has already moved on doesn't steal focus.
    const observer = new MutationObserver(() => {
      if (tryFocus()) {
        observer.disconnect();
        observerRef.current = null;
      }
    });
    observer.observe(mainRef.current, { childList: true, subtree: true });
    observerRef.current = observer;
  }, [pathname, navigationType]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/course', label: t('nav.course') },
    { to: '/journal', label: t('nav.journal') },
    { to: '/educators', label: t('nav.educators') },
    { to: '/about', label: t('nav.about') },
  ];
  const headerLinks = links.map((link) => ({
    label: link.label,
    href: link.to,
    active: isNavLinkActive(link.to, pathname),
  }));
  // Settings for this device: outside the five main links (SiteHeader.md),
  // as an icon link at the end of the full header and a separate item in
  // the phone menu.
  const settingsLink = { label: t('nav.settings'), href: '/settings', active: isNavLinkActive('/settings', pathname) };

  // Never the header's business during look-around: whether a learner is
  // technically still "current" underneath, nothing here should look like
  // it's still theirs (CLAUDE.md rule 4 — shared devices, separate work).
  // session.activeLearner is already null whenever lookAround is on.
  const activeLearner = session.activeLearner;
  const learnerForHeader = activeLearner ? { name: activeLearner.name, tone: activeLearner.colour } : null;

  // The "who's learning" picker (and the new-learner form inside it) only
  // exists at "/": returning to it from anywhere else must also navigate
  // there, or the learner is left stranded on the current page with their
  // session cleared but nothing to choose from.
  function handleReturnToPicker(): void {
    void session.returnToPicker();
    if (pathname !== '/') void navigate('/');
  }

  // "I'm new here" in the switcher: clears whoever is current and opens the
  // new-learner form directly, rather than leaving the learner on the plain
  // grid to tap "I'm new here" a second time.
  function handleAddNewLearner(): void {
    void session.returnToPicker();
    void navigate('/?new=1');
  }

  return (
    <>
      <a className="tw-skip-link" href="#main">
        {t('app.skipToContent')}
      </a>
      {import.meta.env.DEV && devRtl ? (
        <p className="tw-dev-banner small" role="status">
          {t('dev.rtlOn')}
        </p>
      ) : null}
      {import.meta.env.DEV && devLocale ? (
        <p className="tw-dev-banner small" role="status">
          {t('dev.localeOn', { locale: devLocale })}
        </p>
      ) : null}
      <div className="tw-header-area">
        <SiteHeader
          logoSrc={MASCOT_SRC}
          links={headerLinks}
          learner={learnerForHeader}
          compact={compact}
          learnerMenuOpen={switcherOpen}
          onLearnerClick={
            learnerForHeader
              ? (event) => {
                  setSwitcherTrigger(event.currentTarget);
                  setSwitcherOpenAt((open) => (open === pathname ? null : pathname));
                }
              : undefined
          }
          onMenuClick={() => setMobileNavOpenAt(pathname)}
        >
          <Link
            to={settingsLink.href}
            className="tw-header-settings"
            aria-label={settingsLink.label}
            aria-current={settingsLink.active ? 'page' : undefined}
          >
            <Icon name="Settings" size={22} />
          </Link>
        </SiteHeader>
        {switcherOpen ? (
          <LearnerSwitcher
            trigger={switcherTrigger}
            learners={session.learners}
            currentLearnerId={activeLearner?.id ?? null}
            onChoose={(id) => void session.chooseLearner(id)}
            onLookAround={() => session.startLookAround()}
            onAddNew={handleAddNewLearner}
            onBackToPicker={handleReturnToPicker}
            onClose={() => setSwitcherOpenAt(null)}
          />
        ) : null}
      </div>
      {/* Empty (and collapsed by CSS) when there is nothing to say. */}
      <div className="tw-shell-banners">
        <ConnectionBanner learner={activeLearner !== null} inLesson={pathname.startsWith('/lesson/')} />
        <UpdateBanner learner={activeLearner !== null} />
        {session.lookAround ? (
          <StatusBanner
            tone="info"
            icon="Eye"
            title={t('header.lookAroundTitle')}
            // With no storage there is no picker to switch to: the action
            // would open a grid that can't actually save anyone.
            action={session.storageAvailable ? t('header.chooseLearner') : undefined}
            onAction={session.storageAvailable ? handleReturnToPicker : undefined}
          >
            {t('header.lookAroundBanner')}
          </StatusBanner>
        ) : null}
      </div>
      <main id="main" ref={mainRef} tabIndex={-1} className="tw-shell-main">
        <Outlet />
      </main>
      {mobileNavOpen ? (
        <MobileNav links={headerLinks} settingsLink={settingsLink} onClose={() => setMobileNavOpenAt(null)} />
      ) : null}
      <ScrollRestoration />
    </>
  );
}

