// Dev only: the module dev-screen.html loads. Renders one docs/screens/*.dc.html
// file against the ORIGINAL reference bundle, in its own isolated document so
// the reference CSS never touches the app's own pages. See README.md.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/fonts.css';
import { ensureBundleLoaded, ScreenFrameApp } from './ScreenFrameApp';

const container = document.getElementById('frame-root');

if (container) {
  ensureBundleLoaded()
    .then(() => {
      createRoot(container).render(
        <StrictMode>
          <ScreenFrameApp />
        </StrictMode>,
      );
    })
    .catch((error: unknown) => {
      container.textContent = `The reference bundle failed to load: ${error instanceof Error ? error.message : String(error)}`;
    });
}
