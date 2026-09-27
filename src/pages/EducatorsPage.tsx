import { Button } from '../components/ds';
import { useI18n } from '../i18n';
import { PlaceholderPage } from './PlaceholderPage';

export function EducatorsPage() {
  const { t } = useI18n();
  return (
    <PlaceholderPage title={t('pages.educators.title')}>
      {/* Until phase 6 links Settings from the header menu. */}
      <div className="tw-placeholder-links">
        <Button variant="secondary" icon="Mic" href="/settings">
          {t('pages.educators.settingsLink')}
        </Button>
      </div>
    </PlaceholderPage>
  );
}
