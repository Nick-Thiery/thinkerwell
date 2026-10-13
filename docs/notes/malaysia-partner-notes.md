# Notes for a partner in Malaysia

Branch `partner-neutral-wording`, October 2026. For the founders (Justin and Nick).

A second organisation, in Malaysia, may pilot Thinkerwell after (or beside) HELP for Refugees in Jakarta. It would use the Malay version. This note says what the organisation needs before a pilot, what the founders should ask a lawyer or an ethics adviser, and the technical steps to add a second organisation.

**How to read it.**

- **Not legal advice.** Nobody who wrote this is a lawyer. Where it names a Malaysian law or an authority, it is what we understood from general knowledge, **not checked against the current text**. Each such point is marked *(verify)* and written as a question.
- **What is true today.** Today the site sends nothing about learners anywhere: work and progress stay on the device. (The two outside services a learner can reach are a YouTube video after a tap, and online speech-to-text, which is off unless staff turn it on.) The measurement build (an events endpoint and a database) is **not built** (`docs/research/MEASUREMENT_PLAN.md`; `docs/notes/partner-kit.md`, decision 1). So most of the data questions below are about what the consent form promises for a future build, and the answers must be settled before that is built or switched on.
- **Not neutral by wording.** The partner kit is now neutral (`docs/notes/partner-kit.md`, "Any partner"). The measurement plan is still HELP's and cites only Indonesian law.

## 1. Questions to ask the partner first

Everything below depends on these. We do not know any of the answers yet.

1. **What kind of organisation is it?** A registered society or company, a school, a community learning centre, a mosque or church school? Who is legally responsible for its learners and its records? Is it a refugee-serving organisation, or does it serve other children facing barriers to education? (The kit says "UNHCR numbers" in one promise, and the site's mission is about youth facing barriers to education. Both fit a refugee centre; neither assumes one.)
2. **Who is the organisation lead?** One named person who is the contact, signs for the organisation, holds the signed forms and the code list, and decides when a pilot starts or stops. And a second person for when the first is away. For HELP the same question is still open (`docs/PRODUCT.md`, "First pilot").
3. **Who are the learners?** Ages (the course is for about 10 to 17), how many, and **which language they read best**. Malay may not be the learners' strongest language, especially for refugee children (HELP's centre teaches mainly in English; `docs/research/LEARNER_CONTEXT.md`). Malay may be mostly for staff and families. The learners can use English or Malay, chosen per learner.
4. **Who runs the sessions?** Teachers or volunteers, how many, how much time they have to prepare, and what they have used before.
5. **Which lessons?** The Malay README lists Lessons 1, 2, 11, 12, 16 and 23 as the "pilot lessons" (`docs/translation/ms/README.md`), but that list was made for HELP. Ask the partner, and check each chosen lesson with someone local first (see 4 below: Lesson 4, faiths, and Lesson 15, batik).

## 2. Native-speaker review of the Malay

The Malay was **drafted by AI and cross-checked by AI. No native speaker has read it**, and it is offered to everyone in the meantime (`docs/translation/ms/README.md`; `CLAUDE.md`, rule 7). About 520 of 4,354 strings are flagged. A partner will put the Malay in front of families, so review it before the pilot, not after.

**Who.** At least one reader who is Malaysian and a fluent Malay writer, ideally a teacher or a person who works with children aged 10 to 17. For Lesson 4, one reader from each faith it names, ideally Malaysian. The Malay terms for faiths and for God matter more in Malaysia than in Indonesia (`docs/translation/ms/README.md`).

**What first (small and quick).** The documents families sign and read: `pages.consentForm`, `pages.pilotStudy`, `pages.infoSheet` and `pages.codeCards` in `src/i18n/messages/ms.json` (about 100 strings), then `pages.organisations` and `pages.setup` (about 110 more). The interface-only spreadsheet is enough for this: `npm run i18n:export -- ms` (`docs/TRANSLATING.md`), then `npm run i18n:import -- ms <file.csv>`.

**What next (the whole thing).** The review spreadsheet with the interface, the 24 lessons, the pictures and the four section checks:

```sh
npm run review:export -- ms                                  # writes docs/translation/ms/review/thinkerwell-ms-review.xlsx, flagged rows first
# the reviewer edits the Malay column, in Excel, LibreOffice or Google Sheets
npm run review:import -- ms path/to/reviewed.xlsx --dry-run  # what would change
npm run review:import -- ms path/to/reviewed.xlsx            # apply it
npm run check:i18n && npm run check:content && npm test
npm run audio:generate -- --lang ms                          # only if lesson text that Listen reads changed
npm run check:audio                                          # fails until the recordings match the text
```

Details: `docs/translation/README.md` ("Reviewing"), `docs/translation/ms/README.md` ("What a native reviewer should do"). The import changes only rows whose Malay was edited, reports a conflict if the repository changed too, and refuses a broken `{placeholder}`. Picture labels are changed in the SVG by hand.

**Decide first** (`docs/translation/ms/KEY_TERMS.md`; a change applied there goes across the course, so tell Nick): *bahagian* against *unit*, *sumber primer*, *kos lepas*, *rasa kekitaan*, *mengkhusus*, *khabar angin*, *kutu*, and *belia* against *remaja*.

**Listen.** A reviewer should listen to a few parts (Lessons 1, 9 and 17) and say whether the voice is clear enough for the learners and which words it gets wrong (`docs/notes/recorded-audio.md`, "Malay"). Measured with a speech-recognition round trip, 12.6% of words came back different; that is a machine's measure, not a person's.

**Real devices.** A reviewer should also check the menu names in the setup guide and Settings on phones set to Malay, and the long labels at 390px (`docs/translation/ms/README.md`, point 5).

### Wording in the consent kit that most needs local eyes

These are our guesses about where Malaysian readers may differ. None is checked.

- **"Program rintis" (pilot).** The key term is "rintis" (`KEY_TERMS.md`: never "projek rintis"). "Projek perintis" and "program perintis" are, we believe, the common forms in Malaysia. The pass for this note changed five bare uses ("Memulakan rintis") to "program rintis"; the word itself still needs a decision. *(verify)*
- **"Belia" (youth).** The kit says "belia berumur kira-kira 10 hingga 17 tahun". In Malaysian official use "belia" may mean ages 15 to 30, so a ten-year-old is not "belia". "Remaja" or "kanak-kanak dan remaja" may be better for the consent form and information sheet. *(verify)* This is an open point already in `KEY_TERMS.md`; the consent form is where it matters most.
- **"Kajian rintis" (the pilot study).** Does "kajian" tell a parent that this is research, with the weight the English "study" has? Is "persetujuan" or "keizinan" the word on a Malaysian form?
- **"Cap jari" (thumbprint)** and the witness line for a parent who cannot read or write: is this how forms are signed locally, or does the partner have its own procedure?
- **"Ibu bapa atau penjaga"** (parent or guardian) is right in Malaysia. Check it covers the people who actually sign for these children (extended family, a community leader, an older sibling). The English says "parent or guardian" only.
- **"Badan amal berdaftar" / "pertubuhan bukan berasaskan keuntungan"** (registered charity / nonprofit) in the honesty line: these have legal meanings. The sentence says Thinkerwell is neither, so the risk is low, but a local reader should confirm it cannot be misread as the opposite.
- **Both languages.** We believe a data-protection notice in Malaysia must be in both Malay and English *(verify, PDPA 2010, notice and choice principle)*. The consent form and the information sheet print in the language on screen, one language at a time. If the partner needs both, print each form twice, once in each language, and give both to the family. Say so in the partner's instructions.
- **Families' own languages.** The kit exists in English, Indonesian and Malay only. Refugee families in Malaysia may speak Burmese languages, Arabic, Dari, Somali and others. The staff note already says to read the forms aloud in the family's language and sign as a witness (`pages.consentForm.staffUse`); the partner needs to say whether it has interpreters. Never machine-translate the forms for families (`docs/TRANSLATING.md`).
- **Content that a Malaysian reader may notice.** Not in the kit, and we did not touch lesson text. Lesson 15 says batik is made "in Indonesia" (one example among several; Malaysia has its own batik traditions, and the origin of batik is a sensitive subject between the two countries). A Malaysian reviewer may want to say so. The video "Explore your world" says refugee children in Malaysia cannot attend government schools: check the partner is comfortable with that line and that it is accurate for them.

## 3. Consent and ethics: questions for a lawyer or ethics adviser

Not answers. The founders should put these to someone qualified in Malaysia (and, for the Singapore side, in Singapore). If a university, school or ministry is involved, its research office will have its own list.

### The law

1. **Does Malaysia's Personal Data Protection Act 2010 (PDPA) apply to this pilot at all?** We understand it covers personal data processed "in respect of commercial transactions" and that federal and state governments are outside it. A free, non-commercial pilot run by a student-led platform and an NGO may or may not count. *(verify.)* Even if it does not, should the pilot follow it anyway, as good practice?
2. **Which version?** We believe the PDPA was amended in 2024 (the Personal Data Protection (Amendment) Act 2024), with parts coming into force in stages from 2025, covering things such as data breach notification and the officers responsible for data. *(verify what is in force on the pilot's start date.)*
3. **Who is the "data user"?** Thinkerwell is not a registered organisation, charity or company. Under the PDPA (and Singapore's PDPA, since the team is in Singapore), someone is responsible for personal data. Is that the partner, Thinkerwell's founders personally, or both? Who signs a data-sharing agreement, if one is needed?
4. **Is a code linked to a list "personal data"?** The kit says a code is "linked to a code, never a name", and the organisation keeps the list that matches codes to names, which Thinkerwell never sees (`docs/notes/partner-kit.md`, decision 3: it is *pseudonymous*, not anonymous). Does the Thinkerwell team then hold personal data under Malaysian law, or only the organisation?
5. **Notice.** Does the information sheet say enough? Things a notice may be expected to give, which ours may not: who the data user is and how to contact them, the purposes, who the data is disclosed to, and the right to see and correct it. Our sheet has the organisation's contact person but no Thinkerwell contact: `CONTACT_EMAIL` in `src/app/contact.ts` is still `null`, so "write to Thinkerwell at …" is left out. A real contact is needed before anything is collected.

### Children and consent

6. **Parental consent.** The kit asks for a parent's or guardian's written consent (two separate yes/no answers, signature or thumbprint), plus the learner's own yes, where the learner's no wins. Is that enough in Malaysia, and what is the age at which a young person can consent for themselves? We believe the age of majority is 18, and the staff note says learners aged 18 or older sign for themselves. *(verify.)*
7. **Is "implied" consent for the class use different from the study?** The form separates "My child can use Thinkerwell in class" from "My child can take part in the pilot study", so a family can say yes to one and no to the other. Is that the right split locally? Does using the site in class need a signed consent at all, given that today no data leaves the device?
8. **Withdrawal.** The form says a family can change their mind at any time, even after the pilot, and the child's answers are deleted. Can we actually delete one child's answers? With a code and an events table, yes in principle. This must be built, and tested, before the promise is made to a family.
9. **Vulnerable children.** If the learners are refugees or asylum seekers: they have, as far as we know, no legal status under Malaysian law, and a leak of a list of names could harm families. The kit's protections (no names, no UNHCR numbers or documents, no photos or locations, nothing about family, journey or home country) are the right ones; an adviser should say whether anything more is needed. *(verify.)*

### Data location and moving data across borders

10. **Today.** No learner data is uploaded. The site's files are served from Vercel's network (we have not looked at what Vercel logs about visitors, such as addresses, and a lawyer may ask). A video that plays contacts YouTube (Google), which gets the device's internet address; the consent form says so, and every video has a written version that sends nothing.
11. **When measurement is built.** The plan puts the answers in a free-tier Postgres (Supabase or Neon) through Vercel (`MEASUREMENT_PLAN.md`, "How to build it"). Where is the database? Is it in Singapore, the US or elsewhere? Malaysia's rules on sending personal data outside the country were, we believe, changed by the 2024 amendment *(verify)*. The questions: is a transfer to Singapore (where the team is) or elsewhere allowed, on what conditions, and does the consent form have to name the country? It does not name one now.
12. **Who can see it.** The form says only the Thinkerwell team sees answers and the organisation gets group results. A hosted database also means the database company's staff could technically reach it. Does that need saying?

### Retention: the 6 months

13. **The promise.** "Everything the study keeps is deleted within 6 months after the pilot ends" (`pages.pilotStudy.keepDelete`). Is 6 months acceptable and the right length locally? The PDPA's retention principle is, as we understand it, "no longer than necessary" *(verify)*.
14. **Does the promise cover everything?** Backups, exports (the planned password-protected CSV), a copy on a founder's laptop, the analysis script's outputs, and the database company's own backups. Any of those that live longer than 6 months break the promise. Decide, and write down, who deletes what, and when.
15. **The organisation's copies.** The signed forms and the code list stay with the organisation. How long it keeps them is its call and its law; the kit says only "somewhere locked".

### Research ethics

16. **Is this research?** A 16-question pre and post check, a writing task and usage data, with results reported to the organisation, may be research in a lawyer's or university's eyes, especially if anyone plans to publish or present results. If so, who reviews the ethics: a university committee, the partner's own board, or no one? If a government school is involved, we believe the Ministry of Education needs to give permission for research in schools *(verify, and ask the partner whether a school is involved)*.
17. **Who marks the writing task?** The consent form says only Thinkerwell team members do (`docs/notes/partner-kit.md`). Is it appropriate for the team to read children's writing, and does the partner or an adviser expect to know who they are, and what safeguarding rules apply to them? Ask an adviser.

## 4. The Malay voice recordings are non-commercial

Listen plays recordings made with Meta's MMS-TTS Malay model (`facebook/mms-tts-zlm`), licensed **CC BY-NC 4.0: non-commercial use only**. It is credited on the Credits page. Thinkerwell is free and uses it only that way (`docs/PRODUCT.md`; `docs/notes/recorded-audio.md`).

Questions for a lawyer, before any partner relationship that involves money:

- Does it matter that the partner might charge fees for its classes (a private centre, a tuition centre, a school that charges)? Is Thinkerwell then "used commercially" through the partner? We do not know how the licence reads for a free site used in a paid class.
- If anyone ever pays Thinkerwell, or Thinkerwell becomes a company or takes grants that depend on a product, the recordings must be made again with another voice first (`npm run audio:generate -- --lang ms`, after changing `VOICES["ms"]` in `scripts/audio/generate.py`).
- The recordings are optional and never in the first download. Without them (or with Save data on and no recording stored) Listen uses a Malay voice on the device if there is one, or is hidden. Until a native speaker has said the voice is clear enough, the partner may prefer that.

## 5. Devices, internet and the setup day

All of this is for the partner to confirm, and for us to test on their real devices.

- **Devices.** Laptops and tablets with a current browser; learners can share (about one device for 1 to 3 learners; `pages.educators.need1`). Android tablets with Chrome or Samsung Internet and iPads with Safari are the cases we have thought about (`docs/notes/pilot-day-tools.md`). Tablets without Google services, and old browsers, we have **not** tested. Ask which models they have.
- **Home Screen on iPad.** The first step of the setup checklist. Otherwise Safari deletes saved work and the offline copy after 7 days without a visit (`docs/LAUNCH_CHECKLIST.md`).
- **Internet.** The first visit downloads about the home page (under 225.5 kB compressed) and then the whole course in the background, under 795 kB compressed in total, in all three languages (`e2e/build-output.spec.ts`; `docs/notes/slow-internet.md`). After that every lesson works without the internet. Videos need it. Optional recordings for Listen are bigger: about 24.3 MB for Malay alone, about 70 MB for all three languages (`docs/notes/recorded-audio.md`), downloaded on a teacher's tap in Settings. Ask the partner whether it has Wi-Fi for the setup day, or whether anyone pays for mobile data.
- **Say it (speech to text) in Malay** works only if the browser can recognise Malay (`ms-MY`) **on the device**; many cannot, and then the button is simply hidden. Check it on each device with Settings, "Check this device" (once per device and browser; `docs/notes/phase-5.md`). Never turn on "Allow online speech-to-text" without telling the families: the consent form does not cover it.
- **Listen voices.** The recordings need no voice from the device. Without a recording and without internet, Listen reads with a Malay voice on the device if there is one; Settings says how to add one.
- **Printing.** A4 in Malaysia, we believe. Everything prints on A4 or Letter, black on white.
- **Time zone and dates.** Dates the site shows (the class view, certificates) use the device's own clock and the language's format. Dates on the information sheet are typed by staff and printed as typed.

## 6. Technical steps to add a second organisation

There is no "organisation" in the app. No setting, account or database row says which organisation a device belongs to. An organisation is only **a code prefix on its cards**, a language chosen on each device, and the printed kit with its name typed on it. So adding one needs no deploy.

- [ ] **Pick the organisation's code prefix** (2 to 5 letters or digits, for example `ABC`; the code is `PREFIX-NN`). **Nothing checks that two organisations do not share a prefix.** Write down the prefixes in use (HELP's cards are `HLP-nn`, as `docs/research/MEASUREMENT_PLAN.md` says) so no two match. When measurement is built, `orgId` and `pilotCode` are separate fields in the planned event shape (`MEASUREMENT_PLAN.md`): decide then how `orgId` is chosen and whether it must be the same as the prefix.
- [ ] **Make the code cards**: `/educators/code-cards?prefix=XXX&count=N` (1 to 60 per run; make more runs for more learners, with a different prefix or by hand). Print on A4, cut along the dashed lines. The list of codes and names stays on paper with the organisation.
- [ ] **Class codes.** The new-learner form's optional "Class code" field takes letters, numbers and hyphens (at most 40 characters in a saved work file; `src/storage/workFile.ts`). The kit's advice is to type the **code as the learner's name** and leave the class code optional. If the partner wants classes, agree a format such as `XXX-A`, `XXX-B`.
- [ ] **Language default.** The device starts in English and nothing guesses from the browser. Set the language on each device **before adding learners** (the header's language switch, or Settings), because a learner who joins takes the language on screen and keeps it as theirs. For a Malay-speaking partner, switch to Bahasa Melayu first. The setup checklist (`/educators/setup`) **has no step for this**; consider adding one, or tell the partner in the instructions. For a device shared by learners of two languages, each learner's own language is saved separately.
- [ ] **Print the kit in the language(s) the families read**: set the language, then print the information sheet (type the organisation's name, dates, number of sessions and contact person) and the consent form (type the name). One organisation name serves every place the form names it. If both Malay and English are needed (see 2 above), print both. The staff note on the consent form says it is a template to check against local rules.
- [ ] **Set up each device**: work through `/educators/setup`, in Malay; it prints on one A4 page to tick device by device.
- [ ] **Lesson audio**: in Settings, "Lesson audio", download Malay (24.3 MB) once on good Wi-Fi, if the partner wants Listen offline.
- [ ] **Check this device** for Say it in Malay, on each device, if the partner wants it.
- [ ] **Set `CONTACT_EMAIL`** in `src/app/contact.ts` to a real address before the pilot (it turns on the contact card on For organisations, "Tell us what to fix", and "write to Thinkerwell at …" on the sheet and form). Never a placeholder.
- [ ] **Run the checks** after any change to the kit's wording: `npm run check:i18n`, `npm run check:content`, `npm test`, `npx playwright test e2e/partner-kit.spec.ts e2e/malay.spec.ts`. The partner-kit spec prints the consent form, sheet, code cards and checklist in English, Indonesian and Malay on A4 and Letter.
- [ ] **Record the partner in `docs/PRODUCT.md`** ("First pilot") once it is agreed, and say what it is waiting for, as that section does for HELP.
- [ ] **When measurement is built**, decide how data is kept apart by organisation (the `orgId` in the event shape), so one organisation's group results are never shown to another, and so a withdrawal or the 6-month deletion can be done per organisation.

## 7. Open questions for the founders

1. Which Malaysian organisation, what kind, and who is its lead? (Section 1.)
2. Is Malay for the learners, for the staff and families, or both? Should English stay the learners' default?
3. Who is the "data user" for Thinkerwell (Section 3, question 3)? Do the founders want a legal entity before collecting data?
4. Which lawyer or adviser, and in which country, do we ask? Is a university or ethics committee involved?
5. Is the 6-month deletion promise one we can keep for every backup and copy (Section 3, question 14)?
6. Where will the measurement database be, and is that fixed before the consent form is signed by any family?
7. Do we widen "never asks for UNHCR numbers" to "ID numbers", for a partner that does not serve refugees? We left the promise as it is, since widening it is a promise.
8. Do we add a "choose the language" step to the setup checklist? It would be a new step, strings and a check, and would change the one-page print.
9. Who pays for a native Malay reviewer, and by when? The consent kit alone is about 100 strings (about 210 with For organisations and the setup checklist); the lessons are much more.
10. Does the partner charge fees (Section 4)? If yes, ask a lawyer about the voice before the pilot.
