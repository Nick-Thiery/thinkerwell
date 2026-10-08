import { Navigate, useLocation, useParams } from 'react-router';
import { LessonPlayerProvider } from '../lesson';
import { LessonPage } from '../pages/lesson/LessonPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { useContent } from '../content/useContent';
import { previewCourseOfLesson } from '../content/courses';
import { previewDoor } from './previewDoor';
import { resolveLessonRoute } from './lessonRoutes';

// A preview course's lesson ("dw-..."): its own code, only where its preview is on (src/courses/).
const PreviewLessonRoute = previewDoor((routes) => routes.PreviewLessonRoute);

/**
 * Handles /lesson/:id and /lesson/:id/:stage, including redirects from old
 * Base44 ids. The query string and hash are kept on redirect, so old
 * educator links like /lesson/l6?preview=true keep their ?preview=true.
 *
 * The lesson player's state (LessonPlayerProvider) is keyed by lesson only,
 * so moving between the stages of one lesson keeps the loaded progress and
 * flushes anything unsaved; LessonPage itself is keyed by step, so each
 * stage starts with fresh local UI state.
 */
export function LessonRoute() {
  const { id, stage } = useParams();
  const { search, hash } = useLocation();
  const content = useContent();
  if (id && previewCourseOfLesson(id)) return <PreviewLessonRoute lessonId={id} stage={stage} />;
  const result = resolveLessonRoute(id, stage, content);

  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'show':
      return (
        <LessonPlayerProvider key={result.lesson.id} lesson={result.lesson} step={result.step}>
          <LessonPage key={result.step} />
        </LessonPlayerProvider>
      );
    case 'not-found':
      return <NotFoundPage />;
  }
}
