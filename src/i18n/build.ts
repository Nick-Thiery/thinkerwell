/**
 * Where the build puts each language's files, and which of them the
 * service worker precaches (vite.config.ts). Pure, with no imports but the
 * language list, so it runs in the build and in tests.
 *
 *   assets/locales/<code>/<hash>.js     a language's messages (src/i18n/messages/<code>.json), and for
 *                                       a language with translated content, its content/<code>/ files
 *   assets/locales/<code>/visuals/...   that language's lesson pictures (content/<code>/visuals/)
 *   assets/pseudo/...                   the pseudo-languages for testing
 *   assets/fonts-arabic/...             Vazirmatn's Arabic letters and their stylesheet
 *
 * Precached: a language's messages once it is `ready`, and the Arabic font
 * once a ready language needs it. Never the pseudo-languages. So today, with
 * only English ready, the precache holds nothing more than before.
 */
import { LOCALES, readyLocales, type LocaleDefinition } from './locales.ts';

/**
 * Matches a language's message file, its translated content (content/<code>/:
 * course, lessons, section checks and pictures' URLs), a pseudo-language,
 * the pseudo-language code and the Arabic font stylesheet in the module graph.
 */
export const LANGUAGE_MODULE =
  /(?:[\\/]src[\\/]i18n[\\/](?:messages[\\/][^\\/]+\.json|pseudo\.ts|fonts[\\/]arabic\.css)|[\\/]content[\\/][a-z]{2,3}(?:-[A-Za-z0-9]+)*[\\/](?:course\.json|(?:lessons|quizzes)[\\/][^\\/]+\.json|visuals[\\/][^\\/]+\.svg\?url)|tw-pseudo-locale:[^\\/]+)$/;

/** A language's translated content file (content/<code>/...), by its code, or null. */
function contentLanguage(id: string): string | null {
  const match = /\/content\/([a-z]{2,3}(?:-[A-Za-z0-9]+)*)\/(?:course\.json|lessons\/|quizzes\/|visuals\/)/.exec(id);
  return match ? match[1]! : null;
}

/**
 * The chunk a language module goes in (a codeSplitting group name), or
 * null for anything else, English included: en.json stays in the app's
 * own chunk.
 */
export function languageChunkName(moduleId: string): string | null {
  const id = moduleId.replace(/\\/g, '/');
  const messages = /\/src\/i18n\/messages\/([^/]+)\.json$/.exec(id);
  if (messages) return messages[1] === 'en' || messages[1] === 'en.notes' ? null : `locale-${messages[1]}`;
  const content = contentLanguage(id);
  if (content) return `locale-${content}`;
  const pseudo = /tw-pseudo-locale:([^/]+)$/.exec(id);
  if (pseudo) return `pseudo-${pseudo[1]}`;
  if (/\/src\/i18n\/pseudo\.ts$/.test(id)) return 'pseudo';
  if (/\/src\/i18n\/fonts\/arabic\.css$/.test(id)) return 'font-arabic';
  return null;
}

/** The file name pattern for a chunk (output.chunkFileNames), by its name. */
export function languageChunkFileName(chunkName: string): string {
  if (chunkName.startsWith('locale-')) return `assets/locales/${chunkName.slice('locale-'.length)}/[hash].js`;
  if (chunkName === 'pseudo' || chunkName.startsWith('pseudo-')) return 'assets/pseudo/[name]-[hash].js';
  if (chunkName === 'font-arabic') return 'assets/fonts-arabic/[name]-[hash].js';
  return 'assets/[name]-[hash].js';
}

/**
 * The file name pattern for an asset (output.assetFileNames): the Arabic
 * font's files and stylesheet go with it, and a language's lesson pictures
 * with its messages.
 */
export function languageAssetFileName(asset: { names?: readonly string[]; originalFileNames?: readonly string[] }): string {
  const sources = [...(asset.originalFileNames ?? []), ...(asset.names ?? [])].map((name) => name.replace(/\\/g, '/'));
  // A language's lesson pictures go with its messages, so they are precached only once it is ready.
  const picture = sources.map((name) => /(?:^|\/)content\/([a-z]{2,3}(?:-[A-Za-z0-9]+)*)\/visuals\//.exec(name)).find(Boolean);
  if (picture) return `assets/locales/${picture[1]}/visuals/[name]-[hash][extname]`;
  if (sources.some((name) => /@fontsource\/vazirmatn\/|(?:^|\/)vazirmatn-|(?:^|\/)font-arabic\.css$|\/src\/i18n\/fonts\/arabic\.css$/.test(name))) {
    return 'assets/fonts-arabic/[name]-[hash][extname]';
  }
  return 'assets/[name]-[hash][extname]';
}

/**
 * What the service worker leaves out (Workbox globIgnores), given the
 * languages and the message files that exist (their codes).
 */
export function languagePrecacheIgnores(
  messageFileCodes: readonly string[],
  locales: readonly LocaleDefinition[] = LOCALES,
): string[] {
  const ready = readyLocales(locales);
  const readyCodes = new Set(ready.map((locale) => locale.code));
  const notReady = new Set([...messageFileCodes, ...locales.map((locale) => locale.code)].filter((code) => !readyCodes.has(code)));
  return [
    'assets/pseudo/**',
    ...[...notReady].sort().map((code) => `assets/locales/${code}/**`),
    ...(ready.some((locale) => locale.font === 'arabic') ? [] : ['assets/fonts-arabic/**']),
  ];
}
