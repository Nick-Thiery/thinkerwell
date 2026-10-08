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

// A preview course's own interface words (its group of en.json, id.json and
// the rest, by language code), made by the course messages plugin in
// vite.config.ts and loaded only with the course's code (src/courses/).
declare module 'virtual:thinkerwell/course-messages/*' {
  interface CourseMessageTree {
    [key: string]: string | CourseMessageTree;
  }
  const words: Record<string, CourseMessageTree>;
  export default words;
}
