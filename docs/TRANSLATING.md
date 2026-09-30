# Translating Thinkerwell

This is for someone who speaks a learner's home language well and wants to help put Thinkerwell into it. You don't need to know anything about computers beyond using a spreadsheet.

## What you translate, and what stays English

Thinkerwell is also a way to practise English, so **the lessons stay in English**. You translate the words around them: buttons, menus, headings, instructions and messages. We call this "the interface".

(Bahasa Indonesia is the one exception: for the Jakarta pilot its lessons are translated too. That work has its own spreadsheet and review, described in `docs/translation/README.md`.)

You translate:

- Buttons and links ("Start", "Next: Part 2", "Open my journal").
- Instructions and help ("Choose one. You can change it later.").
- Messages ("You're offline.", "Your work is saved on this device.").

These always stay as they are, in English:

- Everything in a lesson: the reading, the questions and answers, the key words and their English meanings, the writing tasks, the video's title and its written version. They are not in the spreadsheet.
- The name **Thinkerwell**.
- People's names (Justin Park, Nick Thiery). You may write them in your script if that is usual.
- The example class code **HLP-07** and the words `[FEEDBACK EMAIL]`.

Later, you may also be asked for a **short meaning of each key word** in your language (one line). It shows under the English meaning when a learner taps a key word. See "Key word meanings" below.

## The spreadsheet

Someone on the Thinkerwell team makes a spreadsheet for your language and sends it to you. (They run `npm run i18n:export -- fa-AF`, with the code of your language: `fa-AF` for Dari, `ar` for Arabic, `so` for Somali.) It is a CSV file. Open it in Google Sheets (File, then Import) or Excel. Your language's letters show correctly in both.

It has five columns:

| Column | What it is | What you do |
| --- | --- | --- |
| key | The message's name inside the site, like `nav.home` | Don't change it. It tells you roughly where the text appears (`nav` is the menu, `pages.home` the home page, `lessonPlayer.write` the Write step). |
| English | The English text | Read it. Don't change it. |
| Notes for the translator | Where the text appears, what the `{words in braces}` mean, and how long it can be | Read it before you translate. |
| Current translation | What the site shows now in your language, if anything | Leave it. |
| New translation | Empty | **Write your translation here.** |

Keep to this:

- Only type in the **New translation** column.
- Don't add, remove or sort rows.
- To change a translation that is already there, write the new one in **New translation**. A blank **New translation** keeps the current one.
- You don't have to do every row at once. Rows you leave blank stay in English for now.
- When you're done, save it as **CSV (UTF-8)** (in Google Sheets: File, Download, Comma-separated values) and send it back. The team loads it with `npm run i18n:import -- fa-AF file.csv`, which checks every row and tells you about any it couldn't use.

### Rows for numbers

Some messages change with a number: "1 lesson", "2 lessons". Languages do this differently, so these messages have one row for each form your language needs. The key ends with the form's name, and the note says which numbers use it.

For example, Arabic has six forms (`zero`, `one`, `two`, `few`, `many`, `other`), so `pages.course.lessonsBadge` has six rows, from `pages.course.lessonsBadge.zero` to `pages.course.lessonsBadge.other`. Dari and Somali have two (`one` and `other`). Where English has no such form, the English column shows its `other` form so you can see the meaning.

In any form except `other` you may write the number as a word ("one lesson") and leave `{count}` out. In the `other` form, keep `{count}`.

## Rules

1. **Keep every `{word in braces}` exactly as it is.** The site puts something there: a number, a name, a lesson's title. Don't translate the word inside the braces and don't change the braces. You may move it to where it belongs in your sentence. The note says what each one is. A row with a missing or changed `{...}` is refused when it is loaded.
2. **Short labels stay short.** Buttons, menu links and small switches have little room, and a phone is narrow. The note gives the English length. Aim for about the same.
3. **Plain, everyday words.** Many learners are young and have missed school. Use the words a 12-year-old would use at home, not formal or official words.
4. **Speak to the learner as "you"**, kindly and simply, the way a good teacher would. Use your language's usual form for talking to a young person.
5. **No exclamation marks.** The English has none; keep it calm.
6. **Don't add "please"** and don't add anything that isn't in the English. Say the same thing, no more, no less.
7. **Be gentle about mistakes.** "Not quite" and "Not quite yet" are kind on purpose. Never use words like "wrong", "incorrect" or "failed".
8. **Use the same words for the same thing everywhere.** The steps (Read, Write, Speak, Watch, Reflect), "Say it", "Read instead" and "Just look around" appear in many messages. Choose one translation for each and keep it.
9. **Numbers and dates are written by the site** in your language's own digits and calendar. Don't type them yourself.
10. **Never paste machine translation as it is.** A tool can help you start, but a person who speaks the language well must write or rewrite every line.
11. **Nothing personal.** Don't put learners' names or anything about anyone in the spreadsheet.

## Key word meanings

Each lesson has four to six key words (like "settlement" or "fertile"), each with a short English meaning. For each, the team may ask you for one short line in your language: the word's meaning in simple words, at most 120 letters and spaces. It isn't a translation of the whole English meaning, just enough to understand the word. The team puts these in the lesson files. A learner sees the line under the English meaning, with your language's name above it.

## Checking a translation (native speaker review)

Every language is checked by a second person who speaks it well before any learner sees it. Until then, learners can't choose it.

1. **Read the spreadsheet.** Read each translation beside its English and note. Does it mean the same? Is it plain and kind? Is it short enough? Mark anything to change in a copy of the spreadsheet.
2. **Look at it on a screen.** The team can show the site in your language on a laptop before it is switched on for learners (they run `npm run dev` and add `?locale=fa-AF` to the address). Go through these pages on a laptop and on a phone-sized window:
   - Home, "I'm new here", a learner's home
   - A lesson: every step (Read with its quick check, Write, Speak, Watch, Reflect) and the finish screen
   - The course page, a section check to the end, My journal
   - Settings, For educators, About
3. **Look for:** words cut off or running into each other, buttons too small for their words, text in the wrong direction (Dari and Arabic read from the right), anything still in English that should be translated, and the same thing called by different names.
4. **Send your changes** in the spreadsheet (in **New translation**) or as a list with the key of each message.
5. When both of you are happy, the team marks the language as ready, and it appears as a choice on the home screen and in Settings.

If the English itself is unclear or seems wrong, say so: it can change too.
