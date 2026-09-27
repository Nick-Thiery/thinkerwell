import { useParams } from 'react-router';
import { getSection } from '../content';
import { CertificatePage } from '../pages/certificate/CertificatePage';
import { NotFoundPage } from '../pages/NotFoundPage';

/** /certificate/section/:id for the four section ids; anything else is not found. */
export function SectionCertificateRoute() {
  const { id } = useParams();
  const section = id ? getSection(id) : undefined;
  return section ? <CertificatePage key={section.id} scope={{ kind: 'section', section }} /> : <NotFoundPage />;
}

/** /certificate/course: the certificate for all 24 lessons. */
export function CourseCertificateRoute() {
  return <CertificatePage key="course" scope={{ kind: 'course' }} />;
}
