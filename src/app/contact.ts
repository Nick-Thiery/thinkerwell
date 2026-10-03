/**
 * The team's public email address, or null while there isn't one.
 *
 * With null, the pages that would show it leave the email out: the
 * Educators page's "Tell us what to fix", the contact card on For
 * organisations, the email half of the consent form's "Questions?" line,
 * and "or write to Thinkerwell at …" on the information sheet. Never show a
 * placeholder such as "[CONTACT EMAIL]" in their place. Setting the address
 * here turns all four on.
 */
export const CONTACT_EMAIL = null as string | null;
