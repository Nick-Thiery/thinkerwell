#!/usr/bin/env node
// npm run i18n:import -- <language code> <file.csv>
//
// Reads a spreadsheet made by i18n:export and filled in, and writes
// src/i18n/messages/<code>.json. For each row it takes the new
// translation, or the current one when the new one is blank. It refuses
// (and lists) rows whose key isn't in en.json or whose {placeholders} don't
// match the English, and exits with an error then, so they can be fixed and
// imported again. Nothing else in the file is lost. See docs/TRANSLATING.md.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { checkMessages, importRows, MESSAGES_DIR, readCsv, readEnglish, translatableLocale, unflatten } from './catalog.ts';

try {
  const [code, file] = process.argv.slice(2);
  const locale = translatableLocale(code);
  if (!file) throw new Error('Give the spreadsheet to read: npm run i18n:import -- ' + locale.code + ' <file.csv>');
  const english = readEnglish();
  const result = importRows(locale, english, readCsv(readFileSync(path.resolve(file), 'utf8')));
  const target = path.join(MESSAGES_DIR, `${locale.code}.json`);
  const tree = unflatten(result.messages, [...english.keys()]);
  writeFileSync(target, `${JSON.stringify(tree, null, 2)}\n`);
  const report = checkMessages(locale.code, tree, english);
  console.log(`Wrote ${path.relative(process.cwd(), target)}: ${result.messages.size} messages in ${locale.englishName}, ${report.missing.length} still in English.`);
  for (const problem of report.errors) console.log(`  Check: ${problem}`);
  if (result.refused.length) {
    console.error(`\nLeft out ${result.refused.length} row(s). Fix them in the spreadsheet and import it again:`);
    for (const problem of result.refused) console.error(`  ${problem}`);
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
