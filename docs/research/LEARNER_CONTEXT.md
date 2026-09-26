# Learner context: HELP for Refugees (Jakarta) pilot

Compiled 26 September 2026 from public sources (listed at the end). Confirm the unknowns with HELP before building anything that depends on them.

## Refugees in Indonesia (UNHCR)

- Indonesia hosts about 12,000–12,700 refugees and asylum-seekers from more than 50 countries.
- As of June 2026, most come from **Afghanistan (39%)**, **Myanmar (21%)** and **Somalia (13%)**. Others come from Sudan, Yemen, Iraq, Sri Lanka and Palestine.
- They live in cities: Jakarta and Greater Jakarta, Aceh, Medan, Pekanbaru, Batam, Makassar and others. Rohingya refugees from Myanmar arrive mostly by boat in Aceh, so Jakarta's refugee population is likely to be mostly Afghan.
- Indonesia isn't a party to the 1951 Refugee Convention and treats itself as a transit country. Refugees can't work legally and have no path to local integration, and many have waited for resettlement for years, some for more than a decade.
- UNHCR's own help site for Indonesia is published in **English, Somali and Farsi**. That's a useful signal of which languages the population actually needs.

## HELP for Refugees

- A refugee-led learning centre in **Tebet, South Jakarta**. It was founded in 2017 by two Afghan refugees and is run by volunteers from the refugee community, led by Director and Principal Zaki Azimi.
- It sits under **Yayasan HELP Indonesia Peduli**, a registered Indonesian foundation with an Indonesian board of trustees.
- It serves a community of **200+ people from 12+ nationalities**. The site reports **150+ students**: about **70 in primary classes** and **80 in English for Adults**.
- Programmes:
  - in-person classes for **Kindergarten to Grade 6** (Monday–Thursday, 9:00–11:30 and 12:00–2:30)
  - art class
  - English for Adults (Starter to Level 4)
  - a **computer literacy programme** that runs "despite limited facilities"
  - health workshops
- It says it educates "children, teenagers and adults". The only structured children's classes it lists are K–6.

## What this likely means for Thinkerwell

1. **Age and reading level.** HELP's formal children's classes stop at Grade 6. Thinkerwell learners may be the oldest primary students, or teens outside any class. Ask HELP who exactly will use it.
   - The current lessons read at roughly grade 6–11 (see `BASE44_AUDIT.md`), which is too hard for many English learners at that age.
   - Aim for the simpler-English version at about grade 3–4 and the standard version at about grade 5–6.
2. **English first is right for now.** Refugee-led centres in Jakarta teach mainly in English, because families hope to resettle in English-speaking countries.
3. **The first translation to add is probably not Indonesian.** It's more likely the learners' home languages:
   - **Dari/Farsi (Persian)**: the Afghan majority, many of them Hazara.
   - **Somali.**
   - **Arabic**, for Sudanese, Yemeni, Iraqi and Palestinian families.

   Bahasa Indonesia still helps the Indonesian volunteer teachers, and kids who've lived in Jakarta for years.
4. **Build for right-to-left scripts from day one.** Farsi and Arabic are written right to left, and switching a finished site over later is painful. In practice:
   - use CSS logical properties (`margin-inline-start`, not `margin-left`)
   - set `dir` per locale
   - choose fonts with Arabic-script support
5. **Devices and internet.** Expect shared laptops and tablets with unreliable Wi-Fi. That calls for:
   - an offline-capable site: cache lessons, and queue saves and analytics until back online
   - a learner switcher for shared devices
   - light pages
   - every video optional, with the written alternative always there
6. **Sensitive topics.** Lesson 4 (origin accounts) and Lesson 19 (belonging) need a HELP educator to review them first. So do the video warnings on Lessons 9, 13, 14 and 24.

## Questions for HELP

- Who will use Thinkerwell: which ages and grades, how many learners, and how many sessions each week?
- What languages do those learners speak at home, and how strong is their English?
- What devices are there (how many, laptops or tablets, which browser), and what is the Wi-Fi like?
- Will a HELP teacher run each session, and who is it?
- Which 6–8 lessons would they like to pilot?
- What do they need for parental consent? Do they already have a consent process for photos or data?

## Sources

- UNHCR Indonesia, home page (June 2026 origin figures): https://www.unhcr.org/id/en
- UNHCR, Indonesia country page: https://www.unhcr.org/where-we-work/countries/indonesia
- UNHCR Indonesia, World Refugee Day 2026 release: https://www.unhcr.org/id/en/news/press-releases/world-refugee-day-2026-unhcr-appreciates-indonesia-s-longstanding-commitment
- UNHCR Help Indonesia (language options): https://help.unhcr.org/indonesia/
- HELP for Refugees, home page, programmes and story: https://www.help4refugees.or.id/, https://www.help4refugees.or.id/our-program, https://www.help4refugees.or.id/about
- Forced Migration Review, "Refugee-led education in Indonesia": https://www.fmreview.org/economies/brown-6/
- UNHCR Indonesia, Roshan Learning Center story: https://www.unhcr.org/id/en/news/stories/roshan-learning-center-empowers-brings-hope-refugees
- UN Indonesia, refugee-led organisations in Jakarta and Medan: https://indonesia.un.org/en/260363-refugees-jakarta-and-medan-uplifting-others-provides-sense-purpose
