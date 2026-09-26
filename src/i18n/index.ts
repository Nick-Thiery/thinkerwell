// Public entry for i18n. Import from 'src/i18n' (e.g. '../i18n').
export * from './core';
export { I18nProvider, useI18n } from './I18nProvider';
export type { I18nContextValue } from './I18nProvider';
export { applyDocumentLocale, readDevDirection, DEV_DIR_STORAGE_KEY } from './direction';
