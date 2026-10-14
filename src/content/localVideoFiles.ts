/**
 * Each language's local-language videos file (content/<code>/videos.json,
 * src/content/localVideos.ts), each loaded on first use. It is a small
 * chunk of its own beside the language's lessons (src/i18n/build.ts), so the
 * Credits page can list every language's approved videos without downloading
 * every language's lessons, and the language's own chunk fetches it with the
 * lessons (src/i18n/load.ts). The build keeps only approved entries in it.
 */
const files = import.meta.glob<unknown>('../../content/*/videos.json', { import: 'default' });

const codeOf = (path: string) => path.replace(/^.*\/content\/([^/]+)\/videos\.json$/, '$1');

/** The codes of the languages that have a videos file in this build. */
export function localVideoCodes(): string[] {
  return Object.keys(files).map(codeOf);
}

/** A language's videos file, or undefined when it has none. A file that can't be loaded rejects. */
export async function loadLocalVideosFile(code: string): Promise<unknown> {
  const load = files[`../../content/${code}/videos.json`];
  return load ? load() : undefined;
}
