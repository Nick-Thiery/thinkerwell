import { useRef, useState } from 'react';
import { isPageDownloadError, reloadPage, siteAnswers } from '../app/pageDownload';
import { usePageTitle } from '../app/usePageTitle';
import { Button } from '../components/ds';
import { useI18n } from '../i18n';

type Attempt = 'none' | 'trying' | 'still-offline';

/**
 * Shown in place of a page whose code couldn't be downloaded
 * (src/app/lazyPage.tsx): on a first visit, the connection dropped before
 * the course was stored on the device. Calm and plain, with "Try again" and
 * a way home; the header stays, so every page already downloaded is still
 * a tap away.
 *
 * "Try again" asks for the page's code again. Chromium keeps a failed
 * download for as long as the page is open and never asks the network
 * twice, so if that fails and the site answers (the connection is back),
 * the page loads again from the start, which downloads it. If the site
 * doesn't answer, it says the internet is still not there.
 */
export function PageNotDownloaded({ retry }: { retry: () => Promise<void> }) {
  const { t } = useI18n();
  usePageTitle(t('pageNotDownloaded.title'));
  const [attempt, setAttempt] = useState<Attempt>('none');
  const [crash, setCrash] = useState<{ error: unknown } | null>(null);
  const trying = useRef(false);

  // Anything but a failed download goes to the route's error page, as before.
  if (crash) throw crash.error;

  async function tryAgain(): Promise<void> {
    if (trying.current) return;
    trying.current = true;
    setAttempt('trying');
    try {
      await retry();
      // The page itself shows now.
    } catch (error) {
      if (!isPageDownloadError(error)) {
        setCrash({ error });
      } else if (await siteAnswers()) {
        reloadPage();
      } else {
        setAttempt('still-offline');
      }
    } finally {
      trying.current = false;
    }
  }

  return (
    <div className="tw-placeholder tw-not-downloaded">
      <h1 className="h1" tabIndex={-1}>
        {t('pageNotDownloaded.title')}
      </h1>
      <p className="body-lg">{t('pageNotDownloaded.body')}</p>
      <div className="tw-placeholder-actions">
        <Button variant="primary" size="lg" icon="RefreshCw" onClick={() => void tryAgain()} aria-describedby="not-downloaded-status">
          {t('pageNotDownloaded.retry')}
        </Button>
        <Button variant="secondary" size="lg" icon="Home" href="/">
          {t('pageNotDownloaded.home')}
        </Button>
      </div>
      <p id="not-downloaded-status" className="body" role="status">
        {attempt === 'trying' ? t('pageNotDownloaded.trying') : attempt === 'still-offline' ? t('pageNotDownloaded.stillOffline') : ''}
      </p>
    </div>
  );
}
