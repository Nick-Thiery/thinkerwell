import { lazy, Suspense } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { AboutPage } from '../pages/AboutPage';
import { CoursePage } from '../pages/CoursePage';
import { EducatorsPage } from '../pages/EducatorsPage';
import { HomePage } from '../pages/HomePage';
import { JournalPage } from '../pages/JournalPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppLayout } from './AppLayout';
import { LessonRoute } from './LessonRoute';
import { SectionCheckRoute } from './SectionCheckRoute';

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
    children: [
      { index: true, element: <HomePage /> },
      { path: 'course', element: <CoursePage /> },
      { path: 'lesson/:id', element: <LessonRoute /> },
      { path: 'lesson/:id/:stage', element: <LessonRoute /> },
      { path: 'section/:id/check', element: <SectionCheckRoute /> },
      { path: 'journal', element: <JournalPage /> },
      { path: 'educators', element: <EducatorsPage /> },
      { path: 'about', element: <AboutPage /> },
      // Old Base44 paths.
      { path: 'onboarding', element: <Navigate replace to="/" /> },
      { path: 'courses', element: <Navigate replace to="/course" /> },
      ...devRoutes(),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
