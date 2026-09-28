import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { firstPageReady } from './app/firstPageReady';
import { loadEveryPage, routes } from './app/routes';
import { startServiceWorker } from './offline';
import './styles/index.css';

const router = createBrowserRouter(routes);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// Offline use: production only, so the dev server never serves an old copy.
if (import.meta.env.PROD) startServiceWorker();

// Most pages load their code when first opened (app/routes.tsx): keep
// index.html's header bar until the first one's is here.
void firstPageReady(router).then(() => {
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});

// Once a service worker controls the page (from the second visit on, or once
// the first visit has stored the course), the other pages' code comes from
// the offline copy, not the internet: load it while the page is idle. Every
// page then opens at once, and a tab left open on an older version keeps
// working after another tab updates (the older files are gone from the site
// and from the new offline copy by then).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const whenIdle = (run: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(run) : setTimeout(run, 1000));
  const loadTheRest = () => whenIdle(() => void loadEveryPage().catch(() => undefined));
  if (navigator.serviceWorker.controller) loadTheRest();
  else navigator.serviceWorker.addEventListener('controllerchange', loadTheRest, { once: true });
}
