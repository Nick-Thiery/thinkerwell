import { useParams } from 'react-router';
import { previewCourseOfSection } from '../content/courses';
import { useContent } from '../content/useContent';
import { AnswerKeyPage } from '../pages/educators/AnswerKeyPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { previewDoor } from './previewDoor';

const PreviewAnswerKeyRoute = previewDoor((routes) => routes.PreviewAnswerKeyRoute);

/**
 * /educators/section/:id/answers for Our World's four section ids, or a
 * preview course's section (handed to its code: src/courses/routes.tsx);
 * anything else is not found.
 */
export function AnswerKeyRoute() {
  const { id } = useParams();
  const content = useContent();
  if (id && previewCourseOfSection(id)) return <PreviewAnswerKeyRoute sectionId={id} />;
  const section = id ? content.getSection(id) : undefined;
  const quiz = section ? content.getQuiz(section.id) : undefined;
  return section && quiz ? <AnswerKeyPage key={section.id} section={section} quiz={quiz} /> : <NotFoundPage />;
}
