import { AnswerKeyPage } from '../../pages/educators/AnswerKeyPage';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { SectionCheckPage } from '../../pages/SectionCheckPage';
import { usePreviewCourse } from './course';
import { PreviewCourseFrame } from './Frame';

/** A section of the course, with its check, or nothing (an unknown section, or a course without checks). */
function useSectionWithCheck(sectionId: string) {
  const course = usePreviewCourse();
  const section = course.content.getSection(sectionId.toLowerCase());
  const quiz = section ? course.content.getQuiz?.(section.id) : undefined;
  return { course, section, quiz };
}

/** /section/:id/check for one of a preview course's sections: the shared section check, with the course's content. */
export function PreviewSectionCheckRoute({ sectionId }: { sectionId: string }) {
  const { course, section, quiz } = useSectionWithCheck(sectionId);
  if (!section || !quiz) return <NotFoundPage />;
  return (
    <PreviewCourseFrame course={course}>
      <SectionCheckPage key={section.id} section={section} />
    </PreviewCourseFrame>
  );
}

/** /educators/section/:id/answers for one of a preview course's sections: the shared answer key. */
export function PreviewAnswerKeyRoute({ sectionId }: { sectionId: string }) {
  const { course, section, quiz } = useSectionWithCheck(sectionId);
  if (!section || !quiz) return <NotFoundPage />;
  return (
    <PreviewCourseFrame course={course}>
      <AnswerKeyPage key={section.id} section={section} quiz={quiz} />
    </PreviewCourseFrame>
  );
}

