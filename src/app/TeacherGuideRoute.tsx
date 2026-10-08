import { Navigate, useLocation, useParams } from 'react-router';
import { NotFoundPage } from '../pages/NotFoundPage';
import { TeacherGuidePage } from '../pages/educators/TeacherGuidePage';
import { useContent } from '../content/useContent';
import { previewCourseOfLesson } from '../content/courses';
import { previewDoor } from './previewDoor';
import { resolveTeacherGuideRoute } from './lessonRoutes';

// A preview course's lesson ("dw-..."): its own code, only where its preview is on (src/courses/).
const PreviewTeacherGuideRoute = previewDoor((routes) => routes.PreviewTeacherGuideRoute);

/** /educators/lesson/:id: a lesson's teacher guide, with old Base44 ids redirected like the lesson itself. */
export function TeacherGuideRoute() {
  const { id } = useParams();
  const { search, hash } = useLocation();
  const content = useContent();
  if (id && previewCourseOfLesson(id)) return <PreviewTeacherGuideRoute lessonId={id} />;
  const result = resolveTeacherGuideRoute(id, content);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'show':
      return <TeacherGuidePage key={result.lesson.id} lesson={result.lesson} />;
    case 'not-found':
      return <NotFoundPage />;
  }
}
