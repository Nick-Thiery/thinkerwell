import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

// Finds English left on a page that should be all Indonesian (or Malay): visible text,
// and the aria-label, placeholder, title and alt of anything visible, and
// the browser tab's title. Not a spec file itself.
//
// Indonesian and English share an alphabet, so "any Latin letter" can't tell
// them apart. A text counts as English when it is (1) an English interface
// message exactly (from en.json, with its {placeholders} matching anything),
// or (2) at least two common English words that Indonesian never uses
// ("the", "your", "and" ...), or one English word that is a whole button
// or label on its own ("Continue"), or (3) an English month name (a date not
// written in Indonesian). Allowed: the name Thinkerwell, learners' names
// (passed in as `allowed`), the English videos' titles and channels (the
// videos stay English), and the names of institutions and works in the
// sources' titles, which the translation keeps.

const root = path.join(import.meta.dirname, '..');
const readJson = <T>(...parts: string[]) => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree): string[] {
  return Object.values(tree).flatMap((value) => (typeof value === 'string' ? [value] : leaves(value)));
}

const englishMessages = leaves(readJson<Tree>('src', 'i18n', 'messages', 'en.json'));

/** The languages whose pages this can check: the interface and the lessons are both translated. */
export type TranslatedLang = 'id' | 'ms';

/** English messages as patterns ({placeholders} match anything), leaving out any that read the same in the language ("Menu"). */
export function englishMessagePatterns(lang: TranslatedLang): string[] {
  const same = new Set(leaves(readJson<Tree>('src', 'i18n', 'messages', `${lang}.json`)));
  return englishMessages
    .filter((message) => message.replace(/\{\w+\}/g, '').replace(/[^A-Za-z]/g, '').length >= 3 && !same.has(message))
    .map((message) => `^${message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '.*')}$`);
}

export const ENGLISH_MESSAGE_PATTERNS = englishMessagePatterns('id');

/** The videos' titles and channels: they stay English in every language. */
export const VIDEO_TEXT = readdirSync(path.join(root, 'content', 'lessons'))
  .filter((name) => name.endsWith('.json'))
  .flatMap((name) => {
    const { watch } = readJson<{ watch: { title: string; channel: string } }>('content', 'lessons', name);
    return [watch.title, watch.channel];
  });

/**
 * The names in the sources' titles that the translation keeps in English:
 * each piece of an English title (split at ":", "(", ")" and ",") of two
 * words or more that its Indonesian title repeats word for word, such as
 * "The Metropolitan Museum of Art" or "Hunting for History".
 */
export function sourceNames(lang: TranslatedLang): string[] {
  return readdirSync(path.join(root, 'content', 'lessons'))
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => {
      type Sources = { sources: Array<{ label: string }> };
      const english = readJson<Sources>('content', 'lessons', name).sources;
      const translatedSources = readJson<Partial<Sources>>('content', lang, 'lessons', name).sources ?? [];
      return english.flatMap((source, index) => {
        const translated = translatedSources[index]?.label ?? '';
        return source.label
          .split(/[:(),]/)
          .map((piece) => piece.trim())
          .filter((piece) => piece.includes(' ') && translated.includes(piece));
      });
    });
}

export const SOURCE_NAMES = sourceNames('id');

export interface EnglishFound {
  where: string;
  text: string;
}

/** English left on the page, outside `allowed` (and always allowing "Thinkerwell"). */
export async function englishOnPage(page: Page, allowed: readonly string[], lang: TranslatedLang = 'id'): Promise<EnglishFound[]> {
  return page.evaluate(
    ({ patterns, allowed }) => {
      const STOP = new Set(
        'the and your you are is of to with this that what how why for from was were will can not does do an be by it its our their they we has have had there here into about which when where who been only than then these those very should would could'.split(
          ' ',
        ),
      );
      const LONE = new Set(
        'continue start back next close settings home course about journal print save done cancel remove keep yes no optional listen read write speak watch reflect lesson lessons section sections check answer answers question questions learner learners reading writing loading search share download update later retry certificate certificates'.split(
          ' ',
        ),
      );
      // Only the months Indonesian and Malay spell differently (April, September and November are the same).
      const MONTHS = /\b(January|February|March|May|June|July|August|October|December)\b/;
      const messages = patterns.map((source) => new RegExp(source));
      // Allowed text becomes a one-letter stand-in, so a message around it ("Watch: {title}") still matches.
      const strip = (text: string) =>
        allowed
          .concat(['Thinkerwell'])
          .reduce((rest, name) => rest.split(name).join(' X '), text)
          .replace(/\s+/g, ' ')
          .trim();

      const isEnglish = (raw: string): boolean => {
        const text = raw.replace(/\s+/g, ' ').trim();
        // Allowed text (a video's title) takes no part: only what's around it counts.
        const rest = strip(text);
        if (!/[A-Za-z]{2}/.test(rest)) return false;
        if (messages.some((message) => message.test(rest))) return true;
        if (MONTHS.test(rest)) return true;
        const words = rest.toLowerCase().match(/[a-z']+/g) ?? [];
        if (words.length === 1 && LONE.has(words[0])) return true;
        return words.filter((word) => STOP.has(word)).length >= 2;
      };

      const found: Array<{ where: string; text: string }> = [];
      const describe = (el: Element) => {
        const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/)[0]}` : '';
        return `${el.tagName.toLowerCase()}${cls}`;
      };
      const skipped = (el: Element) => el.closest('script, style, noscript, template, [translate="no"]') !== null;

      if (isEnglish(document.title)) found.push({ where: 'title', text: document.title });
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!el || skipped(el) || !el.checkVisibility({ visibilityProperty: true })) continue;
        // The whole visible text of the element, so a sentence split by a link or <strong> reads as one.
        const text = node.textContent ?? '';
        if (isEnglish(text)) found.push({ where: describe(el), text: text.trim().slice(0, 100) });
      }
      for (const el of document.body.querySelectorAll('[aria-label], [placeholder], [title], img[alt]')) {
        if (skipped(el) || !el.checkVisibility({ visibilityProperty: true })) continue;
        for (const attribute of ['aria-label', 'placeholder', 'title', 'alt']) {
          const value = el.getAttribute(attribute);
          if (value && isEnglish(value)) found.push({ where: `${describe(el)} [${attribute}]`, text: value.slice(0, 100) });
        }
      }
      return found;
    },
    { patterns: englishMessagePatterns(lang), allowed: [...allowed, ...VIDEO_TEXT, ...sourceNames(lang)] },
  );
}
