import { useEffect } from 'react';
import { useI18n } from '../i18n';

/** Sets document.title to "<page> | Thinkerwell". */
export function usePageTitle(page: string): void {
  const { t } = useI18n();
  useFullPageTitle(t('app.documentTitle', { page }));
}

/**
 * Sets document.title to `title` as it is. The public pages use it with
 * their search title from en.json (`seo.*`, docs/notes/seo.md), so the tab
 * says what the page's HTML file says to search engines and link previews.
 */
export function useFullPageTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
