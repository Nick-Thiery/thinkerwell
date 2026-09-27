import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from './app/routes';
import { startServiceWorker } from './offline';
import './styles/index.css';

const router = createBrowserRouter(routes);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// Offline use: production only, so the dev server never serves an old copy.
if (import.meta.env.PROD) startServiceWorker();

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
