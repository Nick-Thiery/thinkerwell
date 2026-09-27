// Offline use (phase 6): the service worker from the page's side, the
// connection status and the banners under the header. The worker itself is
// generated at build time (vite.config.ts). See docs/notes/phase-6.md.
export {
  applyServiceWorkerUpdate,
  connectServiceWorker,
  getServiceWorkerSnapshot,
  resetServiceWorkerForTests,
  startServiceWorker,
  useServiceWorker,
  RELOAD_FALLBACK_MS,
  UPDATE_CHECK_MS,
  type OfflineStatus,
  type ServiceWorkerEnvironment,
  type ServiceWorkerSnapshot,
  type WorkboxLike,
} from './serviceWorker';
export { useOnline } from './useOnline';
export { BACK_ONLINE_MS, ConnectionBanner, UpdateBanner } from './ShellBanners';
