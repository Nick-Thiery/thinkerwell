import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { AboutPage } from '../pages/AboutPage';
import { CoursePage } from '../pages/CoursePage';
import { HomePage } from '../pages/HomePage';
import { JournalPage } from '../pages/JournalPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { AppLayout } from './AppLayout';
import { LessonRoute } from './LessonRoute';
import { SectionCheckRoute } from './SectionCheckRoute';

/**
 * Pages for teachers and for paper (Settings, the Educators page, teacher
 * guides, answer keys, print views and certificates) load when they are
 * opened, so a learner's first page downloads less. The service worker
 * precaches them with everything else, so they open offline all the same.
 * Nothing shows in the page area for the moment it takes, and the
 * header stays (AppLayout moves focus to the h1 once it appears).
 */
function later<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T): LazyExoticComponent<ComponentType> {
  return lazy(() => load().then((module) => ({ default: module[name] as ComponentType })));
}

const SettingsPage = later(() => import('../pages/SettingsPage'), 'SettingsPage');
const EducatorsPage = later(() => import('../pages/EducatorsPage'), 'EducatorsPage');
const TeacherGuideRoute = later(() => import('./TeacherGuideRoute'), 'TeacherGuideRoute');
const AnswerKeyRoute = later(() => import('./AnswerKeyRoute'), 'AnswerKeyRoute');
const LessonPrintRoute = later(() => import('./LessonPrintRoute'), 'LessonPrintRoute');
const JournalPrintPage = later(() => import('../pages/print/JournalPrintPage'), 'JournalPrintPage');
const SectionCertificateRoute = later(() => import('./CertificateRoute'), 'SectionCertificateRoute');
const CourseCertificateRoute = later(() => import('./CertificateRoute'), 'CourseCertificateRoute');

function whenLoaded(Page: ComponentType) {
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}

/**
 * Dev-only tools (docs/BUILD_PLAN.md phase 2): a live gallery of every
 * design-system component, the original reference bundle for comparison,
 * and a viewer for docs/screens/*.dc.html. `import.meta.env.DEV` is a
 * compile-time constant, so in a production build this whole expression —
 * including the dynamic import() calls the lazy() below makes — is dead
 * code that the build removes; `npm run build` and a grep of dist/ for
 * "ComponentsPage" or "docs/screens" must both come up empty.
 */
function devRoutes(): RouteObject[] {
  if (!import.meta.env.DEV) return [];
  const ComponentsPage = lazy(() => import('../dev/ComponentsPage'));
  const ReferencePage = lazy(() => import('../dev/ReferencePage'));
  const ScreensIndexPage = lazy(() => import('../dev/ScreensIndexPage'));
  const ScreenViewerPage = lazy(() => import('../dev/ScreenViewerPage'));
  return [
    {
      path: 'dev/components',
      element: (
        <Suspense fallback={null}>
          <ComponentsPage />
        </Suspense>
      ),
    },
    {
      path: 'dev/reference',
      element: (
        <Suspense fallback={null}>
          <ReferencePage />
        </Suspense>
      ),
    },
    {
      path: 'dev/screens',
      element: (
        <Suspense fallback={null}>
          <ScreensIndexPage />
        </Suspense>
      ),
    },
    {
      path: 'dev/screens/:name',
      element: (
        <Suspense fallback={null}>
          <ScreenViewerPage />
        </Suspense>
      ),
    },
  ];
}

/**
 * Every route in the app. Exported on its own so tests can mount it in a
 * memory router. Matching is case-insensitive, and old Base44 paths
 * (/onboarding, /courses, /lesson/l6) redirect to their new places.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    // A crash anywhere below never shows react-router's default error page.
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'course', element: <CoursePage /> },
      { path: 'lesson/:id', element: <LessonRoute /> },
      // Ranked above :stage (a fixed segment beats a dynamic one).
      { path: 'lesson/:id/print', element: whenLoaded(LessonPrintRoute) },
      { path: 'lesson/:id/:stage', element: <LessonRoute /> },
      { path: 'section/:id/check', element: <SectionCheckRoute /> },
      { path: 'journal', element: <JournalPage /> },
      { path: 'journal/print', element: whenLoaded(JournalPrintPage) },
      // Printable certificates, built on the print views' page and toolbar.
      { path: 'certificate/section/:id', element: whenLoaded(SectionCertificateRoute) },
      { path: 'certificate/course', element: whenLoaded(CourseCertificateRoute) },
      { path: 'educators', element: whenLoaded(EducatorsPage) },
      { path: 'educators/lesson/:id', element: whenLoaded(TeacherGuideRoute) },
      { path: 'educators/section/:id/answers', element: whenLoaded(AnswerKeyRoute) },
      { path: 'about', element: <AboutPage /> },
      { path: 'settings', element: whenLoaded(SettingsPage) },
      // Old Base44 paths.
      { path: 'onboarding', element: <Navigate replace to="/" /> },
      { path: 'courses', element: <Navigate replace to="/course" /> },
      ...devRoutes(),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
