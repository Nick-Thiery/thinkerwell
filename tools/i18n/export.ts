#!/usr/bin/env node
// npm run i18n:export -- <language code> [file.csv]
//
// Writes a spreadsheet (CSV, UTF-8 with a BOM so Excel and Google Sheets
// read every letter right) for translating the interface into one language:
// key, English, notes for the translator, the current translation, and an
// empty "New translation" column to fill in. A message with plural forms
// gets one row for each form the language has. See docs/TRANSLATING.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { exportRows, flatten, MESSAGES_DIR, readEnglish, readNotes, translatableLocale, writeCsv } from './catalog.ts';

try {
  const [code, out] = process.argv.slice(2);
  const locale = translatableLocale(code);
  const file = path.join(MESSAGES_DIR, `${locale.code}.json`);
  const current = existsSync(file) ? flatten(JSON.parse(readFileSync(file, 'utf8'))) : new Map<string, unknown>();
  const rows = exportRows(locale, readEnglish(), readNotes(), current);
  const target = path.resolve(out ?? `thinkerwell-${locale.code}.csv`);
  writeFileSync(target, writeCsv(rows));
  const done = rows.slice(1).filter((row) => row[3]).length;
  console.log(`Wrote ${target}: ${rows.length - 1} rows for ${locale.englishName} (${locale.code}), ${done} already translated.`);
  console.log('Fill in the "New translation" column, then: npm run i18n:import -- ' + locale.code + ' <file.csv>');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
