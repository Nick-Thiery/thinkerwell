/**
 * Words that load with a page's code rather than with the app
 * (./lazyGroups.ts): the page's i18n with them added, in the language on
 * screen, else English. A preview course does the same with its own group
 * (src/courses/digital-world/i18n.tsx), marking its lessons English too.
 */
import { Fragment, type ReactNode } from 'react';
import { formatMessage, formatMessageParts, type MessageTree } from './core';
import type { I18nContextValue } from './I18nProvider';
import { formatLocale } from './locales';

function lookup(tree: unknown, key: string): unknown {
  let node: unknown = tree;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/**
 * The page's i18n with the words added. A word comes from the language's
 * own copy, then from the app's messages (the dev server and the test
 * languages have every group), then from English. Everything else
 * (direction, formatting, how content is marked) is the page's own.
 */
export function withWords(parent: I18nContextValue, own: Readonly<Record<string, MessageTree>>): I18nContextValue {
  const lang = formatLocale(parent.definition);
  const resolve = (key: string): { value: unknown; lang: string } | null => {
    const mine = lookup(own[parent.locale], key);
    if (mine !== undefined) return { value: mine, lang };
    return null;
  };
  const english = (key: string) => lookup(own.en, key);
  return {
    ...parent,
    t: (key, params) => {
      const found = resolve(key);
      if (found) return formatMessage(found.value, found.lang, params) ?? key;
      const app = parent.t(key, params);
      if (app !== key) return app;
      const value = english(key);
      return value === undefined ? key : (formatMessage(value, 'en', params) ?? key);
    },
    tx: (key, params) => {
      const found = resolve(key);
      const value = found?.value ?? english(key);
      if (value === undefined) return parent.tx(key, params);
      const parts = formatMessageParts(value, found ? found.lang : 'en', params) ?? [key];
      return parts.map((part, index) => <Fragment key={index}>{part as ReactNode}</Fragment>);
    },
  };
}
