# Partner kit

Branch `partner-kit`. Built on 30 September 2026.

What a new partner organisation needs to start a pilot, in English and Bahasa Indonesia, all through the usual messages (`src/i18n/messages/`), with notes and back-translations for the reviewers (`docs/translation/id/notes/ui.json`).

## What was built

- **For organisations** at `/organisations` (`src/pages/OrganisationsPage.tsx`). What Thinkerwell is, what partners get, what we ask (a contact person, some devices, a few sessions a week for 4 to 6 weeks, honest feedback), privacy (no names, code cards, parental consent), the three tools, and how to contact us. The address is the `[CONTACT EMAIL]` placeholder, shown as it is, like the Educators page's `[FEEDBACK EMAIL]`: there is no form, so the page collects nothing. It says plainly that Thinkerwell is a student-led project, not a registered charity.
- **Consent form** at `/educators/consent-form` (`src/pages/educators/ConsentFormPage.tsx`). A form for a learner's parent or guardian, in the language on screen, on one A4 page in black and white. It covers:
  - what is collected (anonymous data only: time spent, lessons finished, quiz scores, linked to a code);
  - what isn't (names, photos, locations, anything learners write);
  - who can see it, and when it is deleted;
  - that videos come from YouTube, which receives some data when one plays;
  - that taking part is voluntary, for the child too.

  Staff can type the organisation's name, which goes into every place the form names it. Left empty, the form prints a line to write it on. The name is kept in the page only (never saved or put in the address) and marked `translate="no"`. A staff note on screen (not printed) says it is a template to check against their own rules and data protection law, and not legal advice.
- **Code cards** at `/educators/code-cards` (`CodeCardsPage.tsx`, logic in `codeCards.ts`). A prefix (2 to 5 letters or digits, capitalised as typed) and a number of learners (1 to 60) make cards HLP-01, HLP-02 …, ten to an A4 page with dashed lines to cut along, then a list of the codes with an empty space for each name, for the organisation to keep. The prefix and number are in the address, so a reload makes the same cards. Nobody types a name here.
- **The Educators page** has a new part, "Starting a pilot", before the other tools. It links For organisations, the consent form, the code cards and the setup checklist. The other tools (the class view and certificates) are now under "Follow your group". The "Class codes instead of names" card links to the code cards too.
- **A footer on every page** (`src/app/SiteFooter.tsx`), with links to For organisations and Credits (`/credits`, added later; the line saying Thinkerwell is a student-led project, not a registered charity, was taken off the footer then). It is hidden when printing. There was no footer before.
- **Set up this device** was already fully translated and printed on one A4 page in both languages. Step 4 now says that learners with code cards type their code as their name.

## Decisions

1. **The consent form describes the pilot's measurement, which isn't built yet.** Today nothing leaves the device. The For organisations page says so ("We will tell you before that changes"), and says consent comes first "if the pilot measures learning". The form's promises follow `docs/research/MEASUREMENT_PLAN.md`: anonymous events linked to a code, only the team sees the raw data, the organisation gets a report on the whole group, and the data is deleted within 6 months of the pilot ending. The measurement build must keep to these promises, or the form must change first.
2. **Codes as names.** A learner types their code in the name field ("I'm new here"). The new-learner form's optional class code field stays as it is. The card doesn't mention it, to keep the card to one instruction.
3. **Indonesian register.** The printed consent form and the For organisations page speak to adults as "Anda". The staff tools and learner cards use "kamu", like the other Educators pages. This is flagged for the native reviewers to confirm.
4. **Printing.** Both printouts use `src/pages/print/print.css`: black on white with no colour, no toolbar and no header or footer. `e2e/partner-kit.spec.ts` prints each one to A4 in both languages. It checks the page count and that no colour is left.
