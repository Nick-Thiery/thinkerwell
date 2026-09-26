// Dev only: the module dev-reference.html loads. Renders every component in
// the ORIGINAL reference bundle in a representative state, in its own
// isolated document, for /dev/reference to compare against the port. See
// README.md.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/fonts.css';
import { loadReferenceBundle } from './bundleLoader';
import { ReferenceFrameApp } from './ReferenceFrameApp';

const container = document.getElementById('frame-root');

if (container) {
  loadReferenceBundle()
    .then(() => {
      createRoot(container).render(
        <StrictMode>
          <ReferenceFrameApp />
        </StrictMode>,
      );
    })
    .catch((error: unknown) => {
      container.textContent = `The reference bundle failed to load: ${error instanceof Error ? error.message : String(error)}`;
    });
}
