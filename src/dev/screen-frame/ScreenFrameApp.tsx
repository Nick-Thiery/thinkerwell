import { Component, useEffect, type ReactNode } from 'react';
import { loadReferenceBundle } from './bundleLoader';
import { parseDcHtml } from './dcParser';
import './frame.css';

// Dev only. Rendered inside dev-screen.html (an isolated document, never the
// app's own pages) by screen-main.tsx. Reads ?name= and renders that
// docs/screens/<name>.dc.html file against the ORIGINAL reference bundle.
const screenModules = import.meta.glob('/docs/screens/*.dc.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function getScreenName(): string {
  return new URLSearchParams(window.location.search).get('name') ?? '';
}

function RawSource({ raw }: { raw: string }) {
  return (
    <details className="tw-frame-error-source" open>
      <summary>Raw .dc.html source</summary>
      <pre>
        <code>{raw}</code>
      </pre>
    </details>
  );
}

function ErrorPanel({ name, raw, message }: { name: string; raw: string | null; message: string }) {
  return (
    <div className="tw-frame-error">
      <h1>Couldn&apos;t render {name || '(no screen)'}</h1>
      <p>{message}</p>
      {raw !== null ? <RawSource raw={raw} /> : null}
    </div>
  );
}

interface BoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors from the parsed screen (for example a component
 * shape the port hasn't reconciled yet) and shows the raw source instead of a
 * blank frame, per docs/BUILD_PLAN.md.
 */
class ScreenErrorBoundary extends Component<{ name: string; raw: string; children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override render() {
    if (this.state.error) {
      return <ErrorPanel name={this.props.name} raw={this.props.raw} message={this.state.error.message} />;
    }
    return this.props.children;
  }
}

function ScreenContent({ raw }: { name: string; raw: string }) {
  const { element, helmetCss } = parseDcHtml(raw);
  // The screen's own <helmet><style> sets the page background behind it
  // (e.g. "body{margin:0;background:var(--frame)}"); apply it the same way
  // the reference docs would, via <helmet>.
  useEffect(() => {
    if (!helmetCss) return;
    const style = document.createElement('style');
    style.textContent = helmetCss;
    document.head.appendChild(style);
    return () => style.remove();
  }, [helmetCss]);
  return <>{element}</>;
}

export function ScreenFrameApp() {
  const name = getScreenName();
  const path = `/docs/screens/${name}.dc.html`;
  const raw = screenModules[path];

  if (!name) {
    return <ErrorPanel name="" raw={null} message="No screen named. Open this page as dev-screen.html?name=Main." />;
  }
  if (raw === undefined) {
    return <ErrorPanel name={name} raw={null} message={`No file at docs/screens/${name}.dc.html.`} />;
  }

  return (
    <ScreenErrorBoundary name={name} raw={raw}>
      <ScreenContent name={name} raw={raw} />
    </ScreenErrorBoundary>
  );
}

let bundleReady: Promise<void> | null = null;

/** screen-main.tsx awaits this once before its first render. */
export function ensureBundleLoaded(): Promise<void> {
  bundleReady ??= loadReferenceBundle();
  return bundleReady;
}
