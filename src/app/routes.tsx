import { lazy, Suspense } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { CoursePage } from '../pages/CoursePage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { AppLayout } from './AppLayout';
import { lazyPage as page } from './lazyPage';
import { loadPreviewDoor } from './previewDoor';

// Three chunks rather than one per page: fewer files to fetch and keep,
// and they compress better together.
const lessonPages = () => import('./lazy/lessonPages');
const teacherPages = () => import('./lazy/teacherPages');
const morePages = () => import('./lazy/morePages');
// Never stored offline or preloaded: only for a device that turns a preview course on (src/courses/).
const previewPages = loadPreviewDoor;
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
      // Pilot-day tools: setting up a device, the class on it and all its
      // certificates (docs/notes/pilot-day-tools.md), and the partner kit
      // (For organisations, the information sheet, the consent form and code
      // cards), with the other Educators pages.
      { path: 'educators/setup', ...page(teacherPages, (m) => m.SetupPage) },
      { path: 'educators/information-sheet', ...page(teacherPages, (m) => m.InformationSheetPage) },
      { path: 'educators/consent-form', ...page(teacherPages, (m) => m.ConsentFormPage) },
      { path: 'educators/code-cards', ...page(teacherPages, (m) => m.CodeCardsPage) },
      { path: 'organisations', ...page(teacherPages, (m) => m.OrganisationsPage) },
      { path: 'educators/class', ...page(teacherPages, (m) => m.ClassPage) },
      { path: 'educators/class/certificates', ...page(teacherPages, (m) => m.AllCertificatesPage) },
      { path: 'about', ...page(morePages, (m) => m.AboutPage) },
      // Credits read the lessons (sources, videos), so they load with the teacher guides.
      { path: 'credits', ...page(teacherPages, (m) => m.CreditsPage) },
      { path: 'settings', ...page(morePages, (m) => m.SettingsPage) },
      // A preview course (src/courses/): its map, its lessons on paper, and
      // the hidden address that turns it on for this device. "This page
      // isn't here" on every device that hasn't, and nothing downloaded.
      { path: 'course/:courseId', ...page(previewPages, (m) => m.PreviewCourseRoute) },
      { path: 'course/:courseId/print', ...page(previewPages, (m) => m.PreviewCoursePrintRoute) },
      { path: 'preview/:courseId', ...page(previewPages, (m) => m.PreviewSwitchRoute) },
      // Old Base44 paths.
      { path: 'onboarding', element: <Navigate replace to="/" /> },
      { path: 'courses', element: <Navigate replace to="/course" /> },
      ...devRoutes(),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
