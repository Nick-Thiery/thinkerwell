import { useI18n } from '../i18n';
import { PlaceholderPage } from './PlaceholderPage';

export function CoursePage() {
  const { t } = useI18n();
  return <PlaceholderPage title={t('pages.course.title')} />;
}
