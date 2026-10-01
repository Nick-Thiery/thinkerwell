<!--
  Justin's public copy guide, as received on 1 October 2026 and applied in
  the "public copy" pull request. Decisions taken when applying it:
  - About keeps the pilot status and "not a registered charity or nonprofit"
    line (Nick, 1 October 2026). The footer stays links only.
  - There is no contact email yet, so the email parts are hidden
    (src/app/contact.ts is null), never shown as placeholders.
  - About keeps the four UN goal cards, each shortened to one phrase, with a
    no-endorsement note under them.
  - Lesson bodies and titles are not changed (Lesson 24's title still says
    "young people"); the course description and one section description in
    content/course.json are.
  Use this file as the reference for any new public-facing copy.
-->

# Thinkerwell public copy: consistency and simplification handoff

**Prepared for:** the developer or LLM maintaining [thinkerwell.app](https://thinkerwell.app/)  
**Basis:** live public pages reviewed 1 October 2026 (Singapore time): `/`, `/course`, `/about`, `/educators`, `/organisations`, `/credits`, and `/educators/consent-form`. The exact source-file paths are unknown; find the text in the repository rather than assuming a framework or component name.

## 1. Editorial decision

Use **one mission statement** and **one short learner-facing tagline** throughout the public site. Do not write a fresh variation of the mission for every page.

**Canonical mission statement (for About and organisational materials):**

> Thinkerwell is a student-led project working to expand access to free digital social studies learning for underserved youth across Southeast Asia.

**Short public description (for the homepage, footer if needed, and search metadata):**

> Free social studies learning for youth across Southeast Asia, especially those facing barriers to education.

**Only learner-facing tagline:**

> Explore your world.

**Plain product definition:**

> Exploring Our World is a free course with 24 lessons in history, geography, culture and civic life. Learners read, write, speak, watch optional videos and reflect.

These serve different jobs: the tagline invites learners in; the short description explains the audience; the mission describes the initiative; the product definition explains what exists on the site. Do not stack all four together in one hero.

Use **social studies** consistently, without the hyphen. Prefer **Southeast Asia** in ordinary public prose. Use **ASEAN** only in material specifically discussing the regional organisation or a defined ASEAN-country scope. A goal of serving learners across the region should not read like a claim that the course is already deployed across every country. Prefer **underserved youth** or **youth facing barriers to education** over “underprivileged youth.” Use **refugee and displaced learners** in the fuller About description and relevant partner material; do not label a learner this way in the onboarding interface. Use **youth**, never “young people,” in all proposed public copy, including translations where an equivalent is natural.

“Expand access to digital learning” describes the current website. “Provide digital access/technology” could imply devices, internet connections, or distribution programmes that the website does not currently supply. Do not make that claim unless a separate programme has actually launched.

## 2. What the live site currently says and why it drifts

| Location | Current wording or pattern observed | Editorial action |
|---|---|---|
| Home `/` | “Explore your world.” followed by “A free social-studies course. Learn about people, places and communities, and share your own ideas.” | Keep the tagline. Replace the supporting sentence with the short public description; explain the course in a second, concrete sentence only if the layout needs it. |
| About `/about` | A five-sentence “Read with curiosity. Write with evidence. Speak with purpose…” sequence comes before the actual mission. | Remove that second motto. Lead with the canonical mission. Keep the five step labels where they explain how a lesson works. |
| About `/about` | “Free social-studies course for young people across Southeast Asia, made with refugee, displaced and under-served learners in mind.” | Align terms and distinguish the initiative from its first product. Do not imply a completed regional rollout. |
| Course `/course` | “Discover how people, places, communities, and decisions shape the world around us.” | Replace with a concrete one-sentence description of the 24-lesson course. Keep `Exploring Our World` as the course name. |
| Educators `/educators` | “Run a Thinkerwell lesson with your group” and a separate long list of session instructions. | A practical page-specific headline is fine. Add only a brief product description; avoid restating the full regional mission in every tool card. |
| Organisations `/organisations` | A separate audience definition says “aged about 10 to 17 who are learning English”; the same page says the course is in English and Bahasa Indonesia. | Use the canonical mission plus precise pilot details. Keep age and language details as factual specifications, not a competing mission. Confirm whether “learning English” accurately defines all intended learners. |
| About SDG cards | Four separate descriptions repeat the access, inequality, civic and partnership messages. | Consolidate into a compact alignment note; preserve attribution/disclaimer as appropriate if any UN icons remain. Avoid implying UN endorsement. |
| Founder bio | “Learning should not stop at borders, displacement or a lack of resources.” | Replace this additional slogan with a concise statement of Justin’s role and motivation using the same mission vocabulary. |
| Educators and organisations | `[FEEDBACK EMAIL]` and `[CONTACT EMAIL]` are still public placeholders. | Replace with the same verified contact address, or remove the email invitation until an address is provided. Do not invent one. |
| Organisation privacy text | “No names” sits beside a homepage asking for a first name or nickname; “Today, nothing at all leaves the device” is too absolute alongside optional YouTube and online speech features. | Clarify that individual users can choose a nickname while pilots can use codes; qualify third-party connections. Verify actual data behaviour before publishing any privacy promise. |
| Consent form | It describes future anonymous pilot data collection, deletion timing and who will see it in definite terms. | Check these claims against the real pilot process and implementation before using the form. Keep the form aligned with the organisation page; do not let a copy edit silently make an unimplemented data policy sound active. |

## 3. Exact replacement copy by page

### A. Home `/`

**Keep the large headline:**

> Explore your world.

**Replace the paragraph underneath it with:**

> Free social studies learning for youth across Southeast Asia, especially those facing barriers to education. Explore history, geography, culture and civic life at your own pace.

**Keep the small factual line, lightly standardised:**

> 24 lessons · 4 sections · no account needed

Keep the five step labels `Read · Write · Speak · Watch · Reflect` as a feature explanation. No second motto or extra mission paragraph is needed in the onboarding card. Keep “Who’s learning today?” and the practical device-saving explanation in plain language.

### B. About `/about`

**Page title:**

> About Thinkerwell

**Replace the five-sentence Read/Write/Speak/Watch/Reflect motto directly below the title with:**

> Free social studies learning for youth across Southeast Asia, especially those facing barriers to education.

**Replace the “What Thinkerwell is” section text with:**

> Thinkerwell is a student-led project working to expand access to free digital social studies learning for underserved youth across Southeast Asia. Its first course, Exploring Our World, has 24 lessons in history, geography, culture and civic life. It is designed with refugee, displaced and other learners facing barriers to education in mind. Learners can use it independently or with an educator.
>
> Thinkerwell is preparing its first pilot with a learning organisation. It is not a registered charity or nonprofit.

Do not turn “designed with … in mind” into a claim that affected learners or educators co-designed the course unless that has actually happened.

**Replace the four repetitive SDG cards with one short section if the layout permits:**

> **How this connects to the UN goals**  
> Thinkerwell’s focus on learning access relates to Sustainable Development Goal 4 (Quality Education) and Goal 10 (Reduced Inequalities). Its civics and media lessons also relate to Goal 16. We hope to work with educators and community organisations as the project develops.

If the existing four-card layout must stay, shorten each card to one distinct factual phrase and do not repeat the mission: `Free learning materials` (Goal 4); `Designed for learners facing barriers` (Goal 10); `Civic and media literacy` (Goal 16); `Seeking educator partnerships` (Goal 17). If UN icons are removed, update the credits' icon attribution accordingly. Retain a clear no-endorsement disclaimer anywhere UN imagery remains.

**Replace Justin’s bio with:**

> Justin is a student in Singapore and Thinkerwell’s founder and director. His interest in history and social studies led him to start a free course for youth who face barriers to education.

**Nick’s bio can remain focused on his actual role. Suggested tighter version:**

> Nick is a student in Singapore and Thinkerwell’s chief technology officer. He builds the website and develops tools that make the lessons easier to use.

Keep the names and titles accurate to the team’s own decisions. Avoid adding new claims about staff size, partnerships or AI features.

### C. Course `/course`

**Keep the course name:**

> Exploring Our World

**Replace the general opening sentence with:**

> A free 24-lesson social studies course about history, geography, culture and civic life. Start anywhere, or follow the lesson numbers.

The section titles and their guiding questions explain different learning areas and can stay. Avoid inserting the regional mission into each section card or each lesson. Maintain `Read`, `Write`, `Speak`, `Watch`, `Reflect` as consistent step names everywhere.

### D. Educators `/educators`

**Keep the page title. Replace the hero copy with:**

> Use Thinkerwell’s free social studies lessons with your group. Teach on one shared screen, in pairs or on separate devices; printable lessons are also available. No learner accounts are needed.

The rest of the page should concentrate on practical instructions, teacher guides, preview, print, code cards and device setup. Do not repeat the mission in each card. Keep honest, current product details such as the need for internet on the first visit and for optional video playback.

**Replace the final feedback invitation, once a real address is supplied, with:**

> Something confusing, too difficult or broken? Tell us at **[VERIFIED THINKERWELL EMAIL]**. Please do not send learners’ names or written answers.

The bracketed address is an implementation dependency, **not text to publish**. If no address exists, remove the email sentence and placeholder until the team provides one.

### E. Organisations `/organisations`

**Replace the opening paragraph with:**

> Thinkerwell is a student-led project working to expand access to free digital social studies learning for underserved youth across Southeast Asia. We are preparing a pilot of our 24-lesson course with learning organisations. This page explains what a pilot involves.

**Add a short factual line, separate from the mission:**

> Exploring Our World is designed for learners roughly ages 10–17. It can be used in English or Bahasa Indonesia on shared laptops or tablets. Lessons work offline after an initial visit; optional videos need internet.

Verify the age range, translation coverage and offline behaviour before shipping that factual line. Retain the accurate disclosure:

> Thinkerwell is not a registered charity or nonprofit.

**Keep “What you get” and “What we ask” as practical lists**, but shorten their introductory text and avoid another description of the full mission. Do not imply existing partner organisations, pilot results, device donations or measured impact.

**Replace the absolute privacy summary with a verified version of this structure:**

> Pilot groups can use learner codes instead of names. The organisation keeps the list matching codes to learners. Lesson writing and recordings are stored on the device. Optional YouTube playback and online speech features may connect to outside services when used. Any future sharing of pilot progress data must be explained to participants before it begins.

Check the actual site behaviour and intended pilot arrangements before publishing. In particular, do not claim that *nothing* leaves the device while optional external services exist, or that anonymous progress data is already being collected if it is only planned.

**Replace `[CONTACT EMAIL]`** with the same verified address used on the educator page. If none is available, remove the public email call to action until one is chosen.

### F. Consent form `/educators/consent-form`

This is a pilot document with specific commitments. Have the pilot owner check its age/language description, code practice, collection plan, who receives data, retention period, YouTube disclosure and contact address against what will actually happen. Fix `[CONTACT EMAIL]` before anyone prints it. Keep its legal/template warning and voluntary-participation language. Do not automatically replace detailed consent terms with the marketing mission or use the document for a pilot until its promises are verified.

### G. Credits `/credits`, navigation and footer

The Credits introduction is appropriately about sources and can remain. Do not insert the full mission there. If the SDG icons change, reconcile their attribution. Leave the navigation’s clear page labels alone. The footer can stay as simple links; it does not need another slogan. If a footer description is required by the design, use the **short public description** verbatim, not a new variation.

### H. Browser metadata and language strings

Audit the HTML title, meta description, Open Graph description, share preview text, PWA/install description, image alt text used as branding, and any structured data. Use the short public description verbatim or a faithful shorter form, and keep the page title specific. Do not invent service locations or pilot results in search snippets.

The site has an English/Bahasa Indonesia selector. Update corresponding translated public strings so the two versions express the same mission and stage. Have a fluent reviewer check translated prose; do not change lesson content or claim that every resource is available in both languages without checking.

## 4. Style rules for future copy

1. Say **Thinkerwell** for the initiative and website; say **Exploring Our World** for its course.
2. Say **free digital social studies learning**, **free social studies course**, and **youth across Southeast Asia** consistently. Do not switch among “global education,” “social-studies platform,” “education technology,” “digital access,” and “ASEAN programme” as if these were separate products.
3. On learner-facing screens, use inclusive plain language. Reserve fuller audience and access framing for About, organisations and outreach materials.
4. State what is available **now** in the present tense. Mark partnerships, pilots, analytics and regional reach as goals or preparation until verified.
5. Prefer short active sentences. One idea per paragraph. Remove duplicate slogans and inflated phrases.
6. Keep instructional copy inside lessons when it helps the activity. This handoff is about public positioning and repeated interface copy, not rewriting the 24 lesson bodies.
7. Never publish square-bracket placeholders or invent a contact address.

## 5. Implementation prompt for the Vercel builder LLM

Copy and paste this section together with the complete file:

> Audit the current Thinkerwell repository and update **public-facing copy only** using the attached `Thinkerwell_Public_Copy_Consistency_Handoff.md` as the approved copy guide. The live reference is `https://thinkerwell.app/` as reviewed 1 October 2026. Locate the strings in source; do not assume file paths. Make the homepage, About, Course, For educators, For organisations, Consent form, Credits, footer, language strings and metadata agree on one mission and product definition. Use **youth** in proposed copy, never “young people.” Preserve existing layout, mascot, colours, animations, routes, accessibility labels, lesson functionality, progress tracking and the 24 lesson bodies unless a copy change specifically requires a small layout adjustment. Remove redundant mottos and repeated mission paragraphs. Keep the project’s current pilot status and legal status accurate. Do not claim device distribution, completed ASEAN-wide deployment, named partners, data collection or privacy behaviour that has not been verified. Replace `[FEEDBACK EMAIL]` and `[CONTACT EMAIL]` only after I supply a verified address; otherwise remove the corresponding email invitation from the public site. Check actual behaviour before editing privacy and consent promises. Apply corresponding copy updates to the Bahasa Indonesia version, with human review flagged for translated prose. After editing, give me a page-by-page summary of exact old/new copy, list any unresolved factual checks, and run the project’s existing build/lint checks. Do not deploy until I review the result.

**Repository search anchors:** `Explore your world.`, `Read with curiosity.`, `Thinkerwell is a free social-studies course`, `Discover how people`, `Run a Thinkerwell lesson`, `aged about 10 to 17`, `[FEEDBACK EMAIL]`, `[CONTACT EMAIL]`, `Today, nothing at all leaves the device`, `learning should not stop at borders`. Search any localization dictionaries and metadata files as well.

**Review before merging:** the homepage has one tagline and a clear audience line; About has one canonical mission; the course name is unchanged; pilot and privacy language matches actual behaviour; no placeholders remain; English and Bahasa Indonesia agree in meaning; no lesson prompts or learner answers are lost; build and lint pass.
