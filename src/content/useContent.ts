import { useI18n } from '../i18n';
import { contentFor, type Content } from './index';

/**
 * The lessons and section checks in the language on screen: translated for
 * a language whose lessons are translated (Indonesian), English otherwise.
 * Only for the lazily loaded pages that show lessons (like ./index.ts).
 */
export function useContent(): Content {
  return contentFor(useI18n().content);
}
