# Privacy & Child Safeguarding page

Added 11 November 2026 from Justin's brief (`Thinkerwell_Privacy_and_Child_Safeguarding_Implementation.md`). Route `/privacy-and-safeguarding`; code in `src/pages/privacy/`; words are the lazily loaded `privacy` group in every ready language (links and source titles stay as given, marked English).

## What the page says, and where it comes from in the code

- **Storage.** Everything a learner does is saved in the browser on the device (IndexedDB: `src/storage/`). "Delete all data" and removing a learner delete it; a work file is saved only when someone saves it in Settings.
- **Services (section 3).** Nothing is loaded from another server except a YouTube video (youtube-nocookie.com) the learner taps to play. No analytics, no ads, no accounts. Fonts, pictures, recordings and the lessons come from this site. Hosting is Vercel. The contact form sends the sender's message through Resend. Listen uses recordings made ahead of time, or a voice already on the device; Say it uses on-device speech recognition only (online dictation is off unless an educator turns it on in Settings); Record yourself keeps clips on the device and never uploads them.
- **Study data.** Collection is paused for everyone (`src/measurement/paused.ts`), so the page does not describe it as running.
- **AI.** Lessons were drafted with AI and reviewed by people; no learner work trains any model. Justin's sentence is kept; a simpler wording is suggested to him in the pull request.

## Facts not in the code (left for Justin)

No named safeguarding lead, response time, reporting address, retention period for contact-form email, or consent record is invented. The contact is `CONTACT_EMAIL`. Effective and last-updated dates are `POLICY_EFFECTIVE` and `POLICY_UPDATED` in `PrivacyPage.tsx`; change them with the text.
