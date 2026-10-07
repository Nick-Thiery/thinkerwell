#!/usr/bin/env node
// node --experimental-strip-types tools/audio/export.ts [out.json]
//
// Writes everything Listen reads (./utterances.ts) as JSON, for
// scripts/audio/generate.py to record. `npm run audio:generate` runs both.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { listenUtterances } from './utterances.ts';

const json = `${JSON.stringify({ languages: listenUtterances() }, null, 1)}\n`;
const out = process.argv[2];
if (out) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, json);
}
else process.stdout.write(json);
