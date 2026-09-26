import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { getPreviewSize } from './screen-frame/previewSize';
import './dev.css';

// Dev only (see src/app/routes.tsx). Renders one docs/screens/<name>.dc.html
// with the ORIGINAL design-system reference bundle, isolated from the app's
// own CSS by loading it in a separate document (dev-screen.html) inside an
// iframe (see docs/screens/README.md for the file format, and
// src/dev/screen-frame/ for how it's parsed). This page itself only checks
// the screen exists and sizes the frame; the reference bundle is never
// imported here, only inside that separate document.
const screenModules = import.meta.glob('/docs/screens/*.dc.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// Not wired into src/i18n/messages/en.json: dev-only scaffolding that never
// ships (see src/app/routes.tsx and ScreensIndexPage.tsx).
export default function ScreenViewerPage() {
  const { name = '' } = useParams();
  const raw = screenModules[`/docs/screens/${name}.dc.html`];
  const size = useMemo(() => (raw ? getPreviewSize(raw) : null), [raw]);
  const frameSrc = `/dev-screen.html?name=${encodeURIComponent(name)}`;

  return (
    <div className="tw-dev-screens">
      <p className="body">
        <Link to="/dev/screens">Back to screens</Link>
      </p>
      {raw === undefined || !size ? (
        <>
          <h1 className="h1" tabIndex={-1}>
            Screen not found
          </h1>
          <p className="body-lg">There&rsquo;s no screen named &ldquo;{name}&rdquo; in docs/screens.</p>
        </>
      ) : (
        <>
          <h1 className="h1" tabIndex={-1}>
            Screen: {name}
          </h1>
          <p className="body">
            <a href={frameSrc} target="_blank" rel="noreferrer">
              Open on its own
            </a>
          </p>
          <div className="tw-dev-screen-frame" style={{ maxWidth: size.width + 24 }}>
            <iframe
              title={`${name}, rendered with the original reference bundle`}
              src={frameSrc}
              width={size.width}
              height={size.height}
              style={{ border: 0, display: 'block' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
