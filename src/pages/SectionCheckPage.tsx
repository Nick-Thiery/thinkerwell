import type { Section } from '../content';
import { useI18n } from '../i18n';
import { PlaceholderPage } from './PlaceholderPage';

interface SectionCheckPageProps {
  section: Section;
}

/** The section check for one section. Built in phase 7. */
export function SectionCheckPage({ section }: SectionCheckPageProps) {
  const { t } = useI18n();
  return <PlaceholderPage title={t('pages.sectionCheck.title', { section: section.title })} />;
}
