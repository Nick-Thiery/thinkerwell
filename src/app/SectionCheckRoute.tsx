import { useParams } from 'react-router';
import { useCatalog } from '../content/useCatalog';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SectionCheckPage } from '../pages/SectionCheckPage';

/** /section/:id/check for the four section ids; anything else is not found. */
export function SectionCheckRoute() {
  const { id } = useParams();
  const catalog = useCatalog();
  const section = id ? catalog.getSection(id) : undefined;
  return section ? <SectionCheckPage key={section.id} section={section} /> : <NotFoundPage />;
}
