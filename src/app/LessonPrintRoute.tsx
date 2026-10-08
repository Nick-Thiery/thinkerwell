import { Navigate, useLocation, useParams } from 'react-router';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LessonPrintPage } from '../pages/print/LessonPrintPage';
import { useContent } from '../content/useContent';
import { previewCourseOfLesson } from '../content/courses';
import { previewDoor } from './previewDoor';
import { resolveLessonPrintRoute } from './lessonRoutes';

// A preview course's lesson ("dw-..."): its own code, only where its preview is on (src/courses/).
const PreviewLessonPrintRoute = previewDoor((routes) => routes.PreviewLessonPrintRoute);

/** /lesson/:id/print: a lesson's print view, with old Base44 ids redirected like the lesson itself. */
export function LessonPrintRoute() {
  const { id } = useParams();
  const { search, hash } = useLocation();
  const content = useContent();
  if (id && previewCourseOfLesson(id)) return <PreviewLessonPrintRoute lessonId={id} />;
  const result = resolveLessonPrintRoute(id, content);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'show':
      return <LessonPrintPage lesson={result.lesson} />;
    case 'not-found':
      return <NotFoundPage />;
  }
}
