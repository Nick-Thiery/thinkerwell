import { Navigate, useLocation, useParams } from 'react-router';
import { LessonPage } from '../pages/LessonPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { resolveLessonRoute } from './lessonUrls';

/**
 * Handles /lesson/:id and /lesson/:id/:stage, including redirects from old
 * Base44 ids. The query string and hash are kept on redirect, so old
 * educator links like /lesson/l6?preview=true keep their ?preview=true.
 */
export function LessonRoute() {
  const { id, stage } = useParams();
  const { search, hash } = useLocation();
  const result = resolveLessonRoute(id, stage);

  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'show':
      return <LessonPage key={`${result.lesson.id}/${result.step}`} lesson={result.lesson} step={result.step} />;
    case 'not-found':
      return <NotFoundPage />;
  }
}
