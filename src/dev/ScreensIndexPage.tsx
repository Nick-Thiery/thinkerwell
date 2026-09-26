import { Link } from 'react-router';
import './dev.css';

// Dev only (see src/app/routes.tsx). Lists docs/screens/*.dc.html, each
// linking to /dev/screens/<Name>, which renders it with the ORIGINAL
// design-system reference bundle (never the ported src/components/ds/*
// code) in an isolated iframe. Nothing here reaches the production build.
const screenModules = import.meta.glob('/docs/screens/*.dc.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function screenNames(): string[] {
  return Object.keys(screenModules)
    .map((path) => path.replace('/docs/screens/', '').replace(/\.dc\.html$/, ''))
    .sort((a, b) => a.localeCompare(b));
}

// Not wired into src/i18n/messages/en.json: this page is dev-only scaffolding
// that never ships (see src/app/routes.tsx), like the isolated frame
// documents' own text (src/dev/screen-frame/ScreenFrameApp.tsx and friends).
export default function ScreensIndexPage() {
  const names = screenNames();

  return (
    <div className="tw-dev-screens">
      <h1 className="h1" tabIndex={-1}>
        Screens
      </h1>
      <p className="body-lg">
        Every screen in docs/screens, rendered with the original design-system reference bundle for comparison. This
        page and everything it links to is dev-only and never ships.
      </p>
      <ul className="tw-dev-screens-list" role="list">
        {names.map((name) => (
          <li key={name}>
            <Link to={`/dev/screens/${name}`}>{name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
