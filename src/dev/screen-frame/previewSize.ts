// Dev only, and deliberately independent of bundleLoader/dcParser: this reads
// plain text (a .dc.html file's source) so the app-side /dev/screens/:name
// page can size its <iframe> without importing anything that would drag the
// reference bundle's raw text into the app's own module graph.

export interface PreviewSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: PreviewSize = { width: 1280, height: 900 };

/**
 * A .dc.html file's own preview size: first its `data-props`
 * (`{"$preview":{"width":...,"height":...}}`) on the `data-dc-script` tag,
 * then the outer wrapper's `width: ...px`, then a 1280x900 default.
 */
export function getPreviewSize(raw: string): PreviewSize {
  const dataPropsMatch = /data-props=(['"])(.*?)\1/.exec(raw);
  if (dataPropsMatch) {
    try {
      const parsed = JSON.parse((dataPropsMatch[2] ?? '').replace(/&quot;/g, '"')) as {
        $preview?: { width?: number; height?: number };
      };
      const preview = parsed.$preview;
      if (typeof preview?.width === 'number' && typeof preview.height === 'number') {
        return { width: preview.width, height: preview.height };
      }
    } catch {
      // Fall through to the width regex below.
    }
  }
  const widthMatch = /width:\s*(\d+)px/.exec(raw);
  const width = widthMatch?.[1];
  if (width !== undefined) {
    return { width: Number(width), height: DEFAULT_SIZE.height };
  }
  return DEFAULT_SIZE;
}
