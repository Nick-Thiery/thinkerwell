import { useI18n } from '../i18n';
import { PlaceholderPage } from './PlaceholderPage';

export function HomePage() {
  const { t } = useI18n();
  return <PlaceholderPage title={t('pages.home.title')} />;
}
