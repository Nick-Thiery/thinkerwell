#!/usr/bin/env node
// npm run pilot:report -- <export.csv|export.json> [more exports] [--from YYYY-MM-DD] [--to YYYY-MM-DD]
//                         [--time-zone Asia/Jakarta] [--json] [--csv-out <folder>]
//
// Turns an export from GET /api/export into the pilot report's usage numbers
// (docs/notes/pilot-measurement.md, "Reading the results";
// docs/research/MEASUREMENT_PLAN.md, "The numbers you'll report"), per
// organisation and, when the files hold more than one, for all of them.
// Prints only codes and numbers. The workings are in ./lib.ts.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildReport, csvTables, formatReport, isTimeZone, prepare, readExport, readLessons, type RawRow, type Report } from './lib.ts';

export interface Options {
  files: string[];
  from?: string;
  to?: string;
  timeZone: string;
  json: boolean;
  csvOut?: string;
}

export const USAGE =
  'Usage: npm run pilot:report -- <export.csv|export.json> [more files] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--time-zone Asia/Jakarta] [--json] [--csv-out <folder>]';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Reads the command line; throws with a message to show when it is wrong. */
export function parseArgs(args: string[]): Options {
  const options: Options = { files: [], timeZone: 'UTC', json: false };
  const valueOf = (flag: string, index: number): string => {
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value.`);
    return value;
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    switch (arg) {
      case '--from':
      case '--to': {
        const value = valueOf(arg, i);
        if (!DATE.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`${arg} needs a date like 2026-11-02.`);
        if (arg === '--from') options.from = value;
        else options.to = value;
        i += 1;
        break;
      }
      case '--time-zone': {
        const value = valueOf(arg, i);
        if (!isTimeZone(value)) throw new Error(`${arg}: unknown time zone (use a name like Asia/Jakarta or UTC).`);
        options.timeZone = value;
        i += 1;
        break;
      }
      case '--csv-out':
        options.csvOut = valueOf(arg, i);
        i += 1;
        break;
      case '--json':
        options.json = true;
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}.`);
        options.files.push(arg);
    }
  }
  if (!options.files.length) throw new Error('Give at least one export file.');
  if (options.from && options.to && options.from > options.to) throw new Error('--from is after --to.');
  return options;
}

export function run(options: Options, root?: string): { report: Report; output: string; written: string[] } {
  const rows: RawRow[] = [];
  for (const file of options.files) {
    if (!existsSync(file)) throw new Error(`No such file: ${file}`);
    rows.push(...readExport(file));
  }
  const report = buildReport(prepare(rows), { from: options.from, to: options.to, timeZone: options.timeZone, lessons: readLessons(root) });
  const written: string[] = [];
  if (options.csvOut) {
    mkdirSync(options.csvOut, { recursive: true });
    for (const [name, content] of Object.entries(csvTables(report))) {
      const file = path.join(options.csvOut, name);
      writeFileSync(file, content);
      written.push(file);
    }
  }
  const output = options.json ? `${JSON.stringify(report, null, 2)}\n` : formatReport(report);
  return { report, output, written };
}

function main(): void {
  let options: Options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    console.error(USAGE);
    process.exit(2);
  }
  try {
    const { output, written } = run(options);
    process.stdout.write(output);
    for (const file of written) console.error(`Wrote ${file}`);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
