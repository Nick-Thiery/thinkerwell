import { Button } from '../components/ds';
import { useI18n } from '../i18n';
import { usePageTitle } from '../app/usePageTitle';

/** The friendly 404. Buttons back into the course; never a dead end. */
export function NotFoundPage() {
  const { t } = useI18n();
  usePageTitle(t('notFound.title'));
  return (
    <div className="tw-placeholder">
      <h1 className="h1" tabIndex={-1}>
        {t('notFound.title')}
      </h1>
      <p className="body-lg">{t('notFound.body')}</p>
      <div className="tw-placeholder-actions">
        <Button variant="primary" size="lg" icon="Home" href="/">
          {t('notFound.home')}
        </Button>
        <Button variant="secondary" size="lg" icon="Map" href="/course">
          {t('notFound.course')}
        </Button>
      </div>
    </div>
  );
}
