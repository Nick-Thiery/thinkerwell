import './dev.css';

// Dev only (see src/app/routes.tsx). Shows the ORIGINAL
// docs/design-system/reference/bundle.js components in their main states —
// the same set as /dev/components — so a reviewer can compare the port side
// by side. Rendered in a separate document (dev-reference.html) inside an
// iframe, isolated from the app's own CSS; the reference bundle is never
// imported here.
// Not wired into src/i18n/messages/en.json: dev-only scaffolding that never
// ships (see src/app/routes.tsx).
export default function ReferencePage() {
  return (
    <div className="tw-dev-reference">
      <h1 className="h1" tabIndex={-1}>
        Reference components
      </h1>
      <p className="body-lg">
        Every component in docs/design-system/reference/bundle.js in a representative state, for comparing against
        /dev/components (the port).
      </p>
      <p className="body">
        Left-to-right only: the reference bundle uses physical CSS properties, so it doesn&apos;t mirror for
        right-to-left. Compare mirroring against the port&apos;s own <code>?dir=rtl</code> instead.
      </p>
      <p className="body">
        <a href="/dev-reference.html" target="_blank" rel="noreferrer">
          Open on its own
        </a>
      </p>
      <div className="tw-dev-screen-frame" style={{ maxWidth: 1304 }}>
        <iframe
          title="Original reference components"
          src="/dev-reference.html"
          width={1280}
          height={1400}
          style={{ border: 0, display: 'block' }}
        />
      </div>
    </div>
  );
}
