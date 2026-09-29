import { useI18n } from '../i18n';
import { catalogFor, type Catalog } from './catalog';

/**
 * The course catalog (course, sections, each lesson's title and question)
 * in the language on screen: translated for a language whose lessons are
 * translated (Indonesian), English otherwise. Every page can use it.
 */
export function useCatalog(): Catalog {
  return catalogFor(useI18n().content);
}
