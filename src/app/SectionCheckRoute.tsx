import { useParams } from 'react-router';
import { previewCourseOfSection } from '../content/courses';
import { useCatalog } from '../content/useCatalog';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SectionCheckPage } from '../pages/SectionCheckPage';
import { previewDoor } from './previewDoor';

const PreviewSectionCheckRoute = previewDoor((routes) => routes.PreviewSectionCheckRoute);

/**
 * /section/:id/check for Our World's four section ids, or a preview course's
 * section (handed to its code: src/courses/routes.tsx); anything else is not
 * found.
 */
export function SectionCheckRoute() {
  const { id } = useParams();
  const catalog = useCatalog();
  if (id && previewCourseOfSection(id)) return <PreviewSectionCheckRoute sectionId={id} />;
  const section = id ? catalog.getSection(id) : undefined;
  return section ? <SectionCheckPage key={section.id} section={section} /> : <NotFoundPage />;
}
