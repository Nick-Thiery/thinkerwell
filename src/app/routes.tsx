import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { CoursePage } from '../pages/CoursePage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { AppLayout } from './AppLayout';

/**
 * A route whose page loads when it is first opened (react-router's `lazy`),
 * so a first visit to the home page or the course map doesn't wait for the
 * code, lessons and styles of pages it isn't showing
 * (docs/notes/slow-internet.md). Every one of these files is still in the
 * service worker's precache, so they all open offline after the first visit.
 * While one loads, the page you are on stays; on a first visit straight to
 * one, index.html's header bar stays until it is ready (main.tsx).
 */
function page<M>(load: () => Promise<M>, pick: (module: M) => ComponentType): Pick<RouteObject, 'lazy'> {
  return { lazy: async () => ({ Component: pick(await load()) }) };
}

// Three chunks rather than one per page: fewer files to fetch and keep,
// and they compress better together.
const lessonPages = () => import('./lazy/lessonPages');
const teacherPages = () => import('./lazy/teacherPages');
const morePages = () => import('./lazy/morePages');
const lesson = page(lessonPages, (m) => m.LessonRoute);

/**
 * Loads every lazily loaded page's code. main.tsx calls it once a service
 * worker controls the page, when the files come from the offline copy
 * rather than the internet.
 */
export function loadEveryPage(): Promise<unknown> {
  return Promise.all([lessonPages(), teacherPages(), morePages()]);
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
      { path: 'lesson/:id', ...lesson },
      // Ranked above :stage (a fixed segment beats a dynamic one).
      { path: 'lesson/:id/print', ...page(teacherPages, (m) => m.LessonPrintRoute) },
      { path: 'lesson/:id/:stage', ...lesson },
      { path: 'section/:id/check', ...page(lessonPages, (m) => m.SectionCheckRoute) },
      { path: 'journal', ...page(teacherPages, (m) => m.JournalPage) },
      { path: 'journal/print', ...page(teacherPages, (m) => m.JournalPrintPage) },
      // Printable certificates, built on the print views' page and toolbar.
      { path: 'certificate/section/:id', ...page(morePages, (m) => m.SectionCertificateRoute) },
      { path: 'certificate/course', ...page(morePages, (m) => m.CourseCertificateRoute) },
      { path: 'educators', ...page(teacherPages, (m) => m.EducatorsPage) },
      { path: 'educators/lesson/:id', ...page(teacherPages, (m) => m.TeacherGuideRoute) },
      { path: 'educators/section/:id/answers', ...page(teacherPages, (m) => m.AnswerKeyRoute) },
      { path: 'about', ...page(morePages, (m) => m.AboutPage) },
      { path: 'settings', ...page(morePages, (m) => m.SettingsPage) },
      // Old Base44 paths.
      { path: 'onboarding', element: <Navigate replace to="/" /> },
      { path: 'courses', element: <Navigate replace to="/course" /> },
      ...devRoutes(),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
