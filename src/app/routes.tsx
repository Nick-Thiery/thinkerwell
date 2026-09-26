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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
