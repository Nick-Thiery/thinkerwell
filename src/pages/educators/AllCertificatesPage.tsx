/**
 * Print all certificates (/educators/class/certificates), from the class
 * view: every certificate earned on this device, each learner's finished
 * sections and then the course if they have finished it, learners in order
 * of name (./classSummary.ts, earnedCertificates). Each prints on a
 * landscape page of its own, in the same layout as a learner's own
 * certificate (../certificate/Certificate.tsx, docs/notes/certificates.md).
 *
 * Names are the learners' names on this device and can't be changed here:
 * a learner's own certificate page is where a name is changed for one print.
 */
import { Link } from 'react-router';
import { classPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { getLessons, getSections } from '../../content';
import { useI18n } from '../../i18n';
import { Certificate } from '../certificate/Certificate';
import '../certificate/CertificatePage.css';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import './AllCertificatesPage.css';
import { earnedCertificates } from './classSummary';
import { useClassWork } from './useClassWork';

export function AllCertificatesPage() {
  const { t, lang } = useI18n();
  const title = t('pages.allCertificates.title');
  usePageTitle(title);
  const { status, work } = useClassWork();

  // Nothing (not even a heading) until every learner's work is read.
  if (status === 'loading') return null;

  const certificates = earnedCertificates(work, getLessons(), getSections(), lang);

  return (
    <div className="tw-print-page tw-cert-page tw-allcert-page">
      <PrintToolbar backHref={classPath()} backLabel={t('pages.allCertificates.back')} canPrint={certificates.length > 0} />

      <header className="tw-allcert-head tw-no-print">
        <h1 className="h1" tabIndex={-1}>
          {title}
        </h1>
        {certificates.length > 0 ? (
          <>
            <p>{t('pages.allCertificates.count', { count: certificates.length })}</p>
            <p className="tw-allcert-names">
              {t('pages.allCertificates.names')} <Link to="/course">{t('pages.allCertificates.namesLink')}</Link>
            </p>
          </>
        ) : (
          <>
            <p>{t('pages.allCertificates.empty')}</p>
            <p className="tw-allcert-names">{t('pages.allCertificates.emptyBody')}</p>
          </>
        )}
      </header>

      {certificates.length > 0 ? (
        <div className="tw-allcert-list">
          {certificates.map(({ learner, scope, finishedAt }) => (
            <Certificate
              key={`${learner.id}-${scope.kind === 'course' ? 'course' : scope.section.id}`}
              scope={scope}
              name={learner.name}
              finishedAt={finishedAt}
              headingLevel={2}
              label={
                scope.kind === 'course'
                  ? t('pages.allCertificates.labelCourse', { name: learner.name })
                  : t('pages.allCertificates.labelSection', { name: learner.name, section: scope.section.title })
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
