import { Link } from 'react-router';
import { useI18n } from '../i18n';
import { usePageTitle } from '../app/usePageTitle';

/** The friendly 404. Links back into the course; never a dead end. */
export function NotFoundPage() {
  const { t } = useI18n();
  usePageTitle(t('notFound.title'));
  return (
    <div className="tw-placeholder">
      <h1 className="h1" tabIndex={-1}>
        {t('notFound.title')}
      </h1>
      <p className="body-lg">{t('notFound.body')}</p>
      <ul role="list" className="tw-placeholder-links">
        <li>
          <Link to="/">{t('notFound.home')}</Link>
        </li>
        <li>
          <Link to="/course">{t('notFound.course')}</Link>
        </li>
      </ul>
    </div>
  );
}
