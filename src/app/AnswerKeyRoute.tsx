import { useParams } from 'react-router';
import { getQuiz, getSection } from '../content';
import { AnswerKeyPage } from '../pages/educators/AnswerKeyPage';
import { NotFoundPage } from '../pages/NotFoundPage';

/** /educators/section/:id/answers for the four section ids; anything else is not found. */
export function AnswerKeyRoute() {
  const { id } = useParams();
  const section = id ? getSection(id) : undefined;
  const quiz = section ? getQuiz(section.id) : undefined;
  return section && quiz ? <AnswerKeyPage key={section.id} section={section} quiz={quiz} /> : <NotFoundPage />;
}
