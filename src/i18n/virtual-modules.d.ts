// The pseudo-languages for testing, made from en.json by the pseudo-locale
// plugin in vite.config.ts (see src/i18n/pseudo.ts).
declare module 'virtual:tw-pseudo-locale/*' {
  interface PseudoMessageTree {
    [key: string]: string | PseudoMessageTree;
  }
  const messages: PseudoMessageTree;
  export default messages;
  /** How the language changes a formatted date or list. */
  export function decorate(text: string): string;
}
