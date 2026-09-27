/**
 * The skills a section check question can test, in the order results list
 * them. Kept out of ./schema so the app can use it without importing zod:
 * anything the browser imports from ./schema that isn't a type pulls all of
 * zod (about 25 kB gzipped) into the bundle, and zod's own feature check
 * calls Function(''), which the site's Content-Security-Policy blocks.
 */
export const QUIZ_SKILLS = ['vocabulary', 'understand', 'evidence', 'apply'] as const;
