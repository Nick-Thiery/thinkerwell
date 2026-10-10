// What the recording voices are given to say for a piece of lesson text:
// the same words, with whatever the voice can't read written out. The text
// on screen never changes; only the voice's input does
// (docs/notes/recorded-audio.md, "Text for the voices").
//
// - English (Kokoro): its own text front end (misaki) already reads numbers,
//   years ("1899", "the 1400s"), decimals, ordinals, initials and letters
//   ("ML", "UN", "BCE") correctly, so only spacing and a few symbols are
//   tidied.
// - Indonesian (MMS-TTS): its tokenizer keeps only lower-case a to z
//   (without q and x), space, apostrophe, hyphen, the em dash and the digits
//   0, 1, 2, 4, 5 and 6, and silently drops everything else, so "1899" would
//   be read as "1". Numbers are written out in Indonesian words (1.000 is a
//   thousand and 13,8 is thirteen point eight, as Indonesian writes them),
//   with ordinals ("ke-8"), decades ("1400-an"), percentages and ranges;
//   capitals that are letters (PBB, ML) are spelt out by their Indonesian
//   names; a few abbreviations are written out; q and x become k and ks;
//   accents are taken off. scripts/audio/generate.py checks that what is
//   left is only what the tokenizer keeps, plus punctuation it drops.
// - Vietnamese (VieNeu-TTS v3 Turbo): its own normaliser (sea-g2p) already
//   reads numbers, years, Vietnamese thousands ("5.500", "75.000") and decimal
//   commas ("13,8"), ranges, percentages, units, Roman numerals and the
//   hyphens in "Ba-bi-lon" correctly, and reads Latin-script names and words
//   (Bayview, Kenya, token) and capital letters (ML) with English sounds.
//   Checked on every sentence of the Vietnamese lessons
//   (docs/notes/recorded-audio.md, "Vietnamese"), so the digits are left to
//   the voice and only what it gets wrong is respelt: Vietnamese
//   transliterations with consonant clusters ("Ti-grơ", "Ơ-phrát"), the
//   Italian "caffè", apostrophes inside names, and odd spaces.

/** Bumped when the output changes, so `npm run audio:generate` records again what it now says differently. */
export const NORMALISER_VERSION = 1;

const ONES = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];

/** 0 to 999 in Indonesian words ("" for 0 inside a bigger number). */
function belowThousand(n: number): string {
  const words: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 1) words.push('seratus');
  else if (hundreds > 1) words.push(`${ONES[hundreds]} ratus`);
  if (rest === 10) words.push('sepuluh');
  else if (rest === 11) words.push('sebelas');
  else if (rest > 11 && rest < 20) words.push(`${ONES[rest - 10]} belas`);
  else if (rest >= 20) {
    words.push(`${ONES[Math.floor(rest / 10)]} puluh`);
    if (rest % 10) words.push(ONES[rest % 10]!);
  } else if (rest > 0) words.push(ONES[rest]!);
  return words.join(' ');
}

const SCALES: Array<[number, string]> = [
  [1e12, 'triliun'],
  [1e9, 'miliar'],
  [1e6, 'juta'],
  [1e3, 'ribu'],
];

/** A whole number in Indonesian words: 1950 → "seribu sembilan ratus lima puluh". */
export function indonesianNumber(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Can't say ${n} in Indonesian words`);
  if (n === 0) return 'nol';
  const words: string[] = [];
  let rest = n;
  for (const [size, name] of SCALES) {
    const count = Math.floor(rest / size);
    rest %= size;
    if (!count) continue;
    // "seribu" for 1,000; "satu juta", "satu miliar" for the larger ones.
    words.push(count === 1 && size === 1e3 ? 'seribu' : `${belowThousand(count)} ${name}`);
  }
  if (rest) words.push(belowThousand(rest));
  return words.join(' ');
}

/** An ordinal: 1 → "pertama", 8 → "kedelapan", 15 → "kelima belas". */
export function indonesianOrdinal(n: number): string {
  return n === 1 ? 'pertama' : `ke${indonesianNumber(n)}`;
}

/** Digits as Indonesian writes them: "75.000" (a dot between thousands), "13,8" (a decimal comma). */
function indonesianValue(written: string): string {
  const [whole, decimals] = written.split(',');
  const value = Number(whole!.replace(/\./g, ''));
  const said = indonesianNumber(value);
  if (decimals === undefined) return said;
  // After the comma each digit is said on its own: 13,25 → "tiga belas koma dua lima".
  return `${said} koma ${[...decimals].map((d) => ONES[Number(d)]).join(' ')}`;
}

/** A written number: 1.000 / 75.000 / 13,8 / 1899 (not a dot or comma at the end of a sentence). */
const ID_NUMBER = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?`;

const ID_LETTERS: Readonly<Record<string, string>> = {
  A: 'a', B: 'be', C: 'ce', D: 'de', E: 'e', F: 'ef', G: 'ge', H: 'ha', I: 'i', J: 'je', K: 'ka', L: 'el', M: 'em',
  N: 'en', O: 'o', P: 'pe', Q: 'ki', R: 'er', S: 'es', T: 'te', U: 'u', V: 'fe', W: 'we', X: 'eks', Y: 'ye', Z: 'zet',
};

/** Abbreviations written out (with their full stop), and units after a number. */
const ID_ABBREVIATIONS: ReadonlyArray<[RegExp, string]> = [
  [/\bdll\./g, 'dan lain-lain'],
  [/\bdsb\./g, 'dan sebagainya'],
  [/\bdst\./g, 'dan seterusnya'],
  [/\btsb\./g, 'tersebut'],
  [/\bNo\.(?=\s*\d)/g, 'nomor'],
  [/\bBpk\./g, 'Bapak'],
  [/\bSdr\./g, 'Saudara'],
  [/\bSdri\./g, 'Saudari'],
  [/\bDr\./g, 'Doktor'],
  [/\bProf\./g, 'Profesor'],
  [/\bIr\./g, 'Insinyur'],
  [/\bHj\./g, 'Haji'],
  [/\bkm\b/g, 'kilometer'],
  [/\bkg\b/g, 'kilogram'],
  [/\bcm\b/g, 'sentimeter'],
  [/°C/g, ' derajat Celsius'],
];

function normaliseIndonesian(text: string): string {
  let out = text.normalize('NFC');
  for (const [pattern, words] of ID_ABBREVIATIONS) out = out.replace(pattern, words);
  // Ranges: "10–20" or "10-20" → "10 sampai 20".
  out = out.replace(new RegExp(`(${ID_NUMBER})\\s*[–-]\\s*(?=\\d)`, 'g'), '$1 sampai ');
  // Ordinals: "ke-8" → "kedelapan".
  out = out.replace(/\bke-(\d+)\b/gi, (_m, n: string) => indonesianOrdinal(Number(n)));
  // Decades and centuries: "1400-an" → "seribu empat ratusan".
  out = out.replace(/\b(\d+)-an\b/g, (_m, n: string) => `${indonesianNumber(Number(n))}an`);
  // Percentages: "50%" → "lima puluh persen".
  out = out.replace(new RegExp(`(${ID_NUMBER})\\s*%`, 'g'), (_m, n: string) => `${indonesianValue(n)} persen`);
  // Every other number. A trailing "." or "," is the sentence's, not the number's.
  out = out.replace(new RegExp(`(?<![\\d.,])(${ID_NUMBER})(?![\\d])`, 'g'), (_m, n: string) => indonesianValue(n));
  // Letters said one by one: PBB → "pe be be"; an initial ("Mina L.") → "el".
  out = out.replace(/\b[A-Z]{2,5}\b/g, (word) => [...word].map((ch) => ID_LETTERS[ch]).join(' '));
  out = out.replace(/\b([A-Z])\.(?=\s|$)/g, (_m, ch: string) => ID_LETTERS[ch]!);
  // Symbols the voice can't say.
  out = out.replace(/&/g, ' dan ').replace(/\+/g, ' tambah ').replace(/[=]/g, ' sama dengan ');
  out = out.replace(/[/\\]/g, ' ').replace(/[–]/g, ' — ');
  // Letters the voice doesn't have: accents off, q and x as they sound.
  out = out
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/q/g, 'k')
    .replace(/Q/g, 'K')
    .replace(/x/g, 'ks')
    .replace(/X/g, 'Ks');
  return out.replace(/\s+/g, ' ').trim();
}

/** A letter that only Vietnamese uses, with or without a tone mark (not in any other language the lessons name). */
const VIETNAMESE_LETTER = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/iu;

/** What a consonant letter is called by itself in Vietnamese ("g" → "gờ"), for the first letter of a cluster. */
const VI_CONSONANT_NAMES: Readonly<Record<string, string>> = { b: 'bờ', c: 'cờ', d: 'dờ', g: 'gờ', k: 'kờ', p: 'pờ', ph: 'phờ' };

/**
 * Vietnamese spellings of foreign names keep the foreign clusters ("Ti-grơ" for Tigris, "Ơ-phrát" for the
 * Euphrates), which are not Vietnamese syllables, and VieNeu reads "grơ" as the English "the" plus "rơ". Each is
 * said as two syllables ("gờ rơ", "phờ rát"). Only a word with a Vietnamese-only letter in it, so English
 * names such as "Brookside" and "Tallgrass" are left alone.
 */
function splitForeignClusters(text: string): string {
  return text.replace(/(?<![\p{L}])(ph|[bcdgkp])([rl])(\p{L}+)/giu, (word, first: string, second: string, rest: string) => {
    const startsWithVowel = /^[aeiouy]/i.test(rest.normalize('NFD'));
    if (!startsWithVowel || !VIETNAMESE_LETTER.test(word)) return word;
    const name = VI_CONSONANT_NAMES[first.toLowerCase()]!;
    const spoken = first[0] !== first[0]!.toLowerCase() ? name[0]!.toUpperCase() + name.slice(1) : name;
    return `${spoken} ${second}${rest}`;
  });
}

function normaliseVietnamese(text: string): string {
  let out = text
    .normalize('NFC')
    .replace(/[\u00a0\u2007\u202f\u2009\u200a]/g, ' ')
    .replace(/\u200b|\u200c|\u200d|\ufeff/g, '');
  // An apostrophe inside a name ("n'Ajjer") is read as a letter name; take it out.
  out = out.replace(/(?<=\p{L})['’](?=\p{L})/gu, '');
  out = splitForeignClusters(out);
  // The Italian "caffè" is cut short after "caf" (the voice drops the final syllable); "café" is read in full.
  out = out.replace(/(?<![\p{L}])caffè(?![\p{L}])/giu, (word) => (word[0] === 'C' ? 'Café' : 'café'));
  return out.replace(/\s+/g, ' ').trim();
}

function normaliseEnglish(text: string): string {
  return text
    .normalize('NFC')
    .replace(/(\d)\s*[–]\s*(?=\d)/g, '$1 to ')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** What the recording voice for `lang` ("en", "id", "vi") is given for `text`. */
export function speechInput(text: string, lang: string): string {
  if (lang === 'id') return normaliseIndonesian(text);
  if (lang === 'vi') return normaliseVietnamese(text);
  return normaliseEnglish(text);
}
