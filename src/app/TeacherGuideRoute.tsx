import { Navigate, useLocation, useParams } from 'react-router';
import { NotFoundPage } from '../pages/NotFoundPage';
import { TeacherGuidePage } from '../pages/educators/TeacherGuidePage';
import { resolveTeacherGuideRoute } from './lessonRoutes';

/** /educators/lesson/:id: a lesson's teacher guide, with old Base44 ids redirected like the lesson itself. */
export function TeacherGuideRoute() {
  const { id } = useParams();
  const { search, hash } = useLocation();
  const result = resolveTeacherGuideRoute(id);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'show':
      return <TeacherGuidePage key={result.lesson.id} lesson={result.lesson} />;
    case 'not-found':
      return <NotFoundPage />;
  }
}
