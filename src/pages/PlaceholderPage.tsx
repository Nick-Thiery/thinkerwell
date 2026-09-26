import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
import { usePageTitle } from '../app/usePageTitle';

interface PlaceholderPageProps {
  title: string;
  children?: ReactNode;
}

/** Phase 1 stand-in for a screen: one h1 and a short note. Replaced screen by screen in later phases. */
export function PlaceholderPage({ title, children }: PlaceholderPageProps) {
  const { t } = useI18n();
  usePageTitle(title);
  return (
    <div className="tw-placeholder">
      <h1 className="h1" tabIndex={-1}>
        {title}
      </h1>
      <p className="body-lg">{t('pages.placeholder')}</p>
      {children}
    </div>
  );
}
