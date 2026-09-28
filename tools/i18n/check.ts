#!/usr/bin/env node
// npm run check:i18n
//
// Checks every translation in src/i18n/messages against en.json. Fails on
// keys that en.json doesn't have, {placeholders} that don't match the
// English, broken plural forms, empty messages and exclamation marks, and
// on a language marked `ready` (src/i18n/locales.ts) that still has English
// in it. For a language that isn't ready it only says how many messages
// are still missing. Also checks that every note in en.notes.json is for a
// real key. Runs in CI (.github/workflows/checks.yml).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { findLocale, LOCALES, readyLocales } from '../../src/i18n/locales.ts';
import { checkMessages, MESSAGES_DIR, readEnglish, readNotes, translatedCodes } from './catalog.ts';

const english = readEnglish();
const errors: string[] = [];

for (const key of Object.keys(readNotes())) {
  if (!english.has(key)) errors.push(`en.notes.json: ${key} is not in en.json`);
}

const codes = translatedCodes();
if (codes.length === 0) console.log(`No translations yet: only English (${english.size} messages).`);
for (const code of codes) {
  const report = checkMessages(code, JSON.parse(readFileSync(path.join(MESSAGES_DIR, `${code}.json`), 'utf8')), english);
  errors.push(...report.errors);
  const locale = findLocale(code, LOCALES);
  const ready = readyLocales().some((one) => one.code === code);
  console.log(`${code} (${locale?.englishName ?? 'not listed'}): ${report.translated} of ${english.size} messages translated, ${report.missing.length} missing${ready ? ', ready' : ''}.`);
  if (ready && report.missing.length) errors.push(`${code}.json: marked ready but ${report.missing.length} messages are still missing, so learners would see English: ${report.missing.slice(0, 5).join(', ')}${report.missing.length > 5 ? ' …' : ''}`);
}
for (const locale of readyLocales()) {
  if (locale.code !== 'en' && !codes.includes(locale.code)) errors.push(`${locale.code} is marked ready in src/i18n/locales.ts but has no src/i18n/messages/${locale.code}.json`);
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log('Language check passed.');
