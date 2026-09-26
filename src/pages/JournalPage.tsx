import { useI18n } from '../i18n';
import { PlaceholderPage } from './PlaceholderPage';

export function JournalPage() {
  const { t } = useI18n();
  return <PlaceholderPage title={t('pages.journal.title')} />;
}
