/**
 * Message groups that load with the pages that use them, not with the app.
 *
 * Every interface word still lives in en.json (and id.json and the rest:
 * CLAUDE.md rule 7, and check:i18n reads the files whole). But the app's
 * first chunk carries en.json, so a group only a lazily loaded page shows
 * would cost every first visit to the home page. The build leaves these
 * groups out of the browser's copy of the message files
 * (stripBuildOnlyMessages in vite.config.ts) and serves each one, in every
 * language, as `virtual:thinkerwell/messages/<group>` (lazyMessages there),
 * which the page's own code imports and puts under its pages with
 * `withWords` (./words.tsx). A preview course's group works the same way
 * (`messages` in src/content/courses.ts).
 *
 * In the dev server and in tests the app's messages still have them too.
 */
export const LAZY_MESSAGE_GROUPS = [
  // Thinkerwell's own videos' words: About, For educators and For organisations (src/pages/siteVideo/).
  'siteVideo',
] as const;

export type LazyMessageGroup = (typeof LAZY_MESSAGE_GROUPS)[number];

/** `import words from 'virtual:thinkerwell/messages/<group>'`: a lazily loaded group's words, by language code. */
export const LAZY_MESSAGES_PREFIX = 'virtual:thinkerwell/messages/';
/** The resolved id of that module (rolldown's convention for a virtual module). */
export const LAZY_MESSAGES_ID = '\0tw-messages:';
