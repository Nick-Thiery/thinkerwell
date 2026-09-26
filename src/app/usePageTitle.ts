import { useEffect } from 'react';
import { useI18n } from '../i18n';

/** Sets document.title to "<page> · Thinkerwell". */
export function usePageTitle(page: string): void {
  const { t } = useI18n();
  useEffect(() => {
    document.title = t('app.documentTitle', { page });
  }, [page, t]);
}
