/**
 * The team's public email address (Justin set it up in October 2026), or null
 * while there isn't one.
 *
 * With null, the pages that would show it leave the email out: the
 * Educators page's "Questions, or something to fix?", the contact card on For
 * organisations, the Privacy & Child Safeguarding page's contact line and
 * the session guide's contact line. Never show a placeholder such as
 * "[CONTACT EMAIL]" in their place. Setting the address here turns all of
 * them on. Wherever it is shown, it is marked translate="no":
 * an address is the same in every language.
 */
export const CONTACT_EMAIL: string | null = 'thinkerwell.hello@gmail.com';
