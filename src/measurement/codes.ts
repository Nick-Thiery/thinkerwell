/**
 * The shapes of the two codes pilot measurement uses. Alone in a file,
 * because the app's first page needs them (src/measurement/gate.ts) and must
 * not download the whole event checker (./events.ts) to get them.
 */

/** An organisation's code, like help-jakarta or my-partner. Given by Thinkerwell; set by an educator in Settings. */
export const ORG_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,31}$/;

/** A learner's pilot code, like HLP-01: the prefix on a code card and a number (src/pages/educators/codeCards.ts). */
export const PILOT_CODE_PATTERN = /^[A-Z0-9]{2,5}-\d{2,3}$/;
