import { isRouteErrorResponse, useRouteError } from 'react-router';
import { useI18n } from '../i18n';
import { usePageTitle } from '../app/usePageTitle';

/**
 * The route-level errorElement (src/app/routes.tsx): a crash anywhere in the
 * app shows this instead of react-router's default error page. It never
 * shows the underlying error to a learner; details go to the console only.
 */
export function RouteErrorPage() {
  const { t } = useI18n();
  const error = useRouteError();
  usePageTitle(t('routeError.title'));

  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="tw-placeholder">
      <h1 className="h1" tabIndex={-1}>
        {t('routeError.title')}
      </h1>
      <p className="body-lg">{isRouteErrorResponse(error) && error.status === 404 ? t('notFound.body') : t('routeError.body')}</p>
      <div className="tw-placeholder-actions">
        {/* A plain link, not the router's: after a crash, a full page load starts clean. */}
        <a className="tw-btn tw-btn-primary tw-btn-lg" href="/">
          {t('routeError.home')}
        </a>
      </div>
    </div>
  );
}
