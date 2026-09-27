import { Navigate, useLocation, useParams } from 'react-router';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LessonPrintPage } from '../pages/print/LessonPrintPage';
import { resolveLessonPrintRoute } from './lessonUrls';

/** /lesson/:id/print: a lesson's print view, with old Base44 ids redirected like the lesson itself. */
export function LessonPrintRoute() {
  const { id } = useParams();
  const { search, hash } = useLocation();
  const result = resolveLessonPrintRoute(id);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'show':
      return <LessonPrintPage lesson={result.lesson} />;
    case 'not-found':
      return <NotFoundPage />;
  }
}
