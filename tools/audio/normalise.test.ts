import { describe, expect, it } from 'vitest';
import { indonesianNumber, indonesianOrdinal, speechInput } from './normalise';
import { listenUtterances } from './utterances';

describe('indonesianNumber', () => {
  it.each([
    [0, 'nol'],
    [1, 'satu'],
    [10, 'sepuluh'],
    [11, 'sebelas'],
    [12, 'dua belas'],
    [19, 'sembilan belas'],
    [20, 'dua puluh'],
    [75, 'tujuh puluh lima'],
    [100, 'seratus'],
    [101, 'seratus satu'],
    [280, 'dua ratus delapan puluh'],
    [1000, 'seribu'],
    [1899, 'seribu delapan ratus sembilan puluh sembilan'],
    [1950, 'seribu sembilan ratus lima puluh'],
    [2007, 'dua ribu tujuh'],
    [5500, 'lima ribu lima ratus'],
    [11000, 'sebelas ribu'],
    [75000, 'tujuh puluh lima ribu'],
    [300000, 'tiga ratus ribu'],
    [1000000, 'satu juta'],
    [13800000000, 'tiga belas miliar delapan ratus juta'],
  ])('%i is "%s"', (n, words) => {
    expect(indonesianNumber(n)).toBe(words);
  });

  it('says ordinals', () => {
    expect(indonesianOrdinal(1)).toBe('pertama');
    expect(indonesianOrdinal(8)).toBe('kedelapan');
    expect(indonesianOrdinal(15)).toBe('kelima belas');
  });
});

describe('speechInput, Indonesian', () => {
  const say = (text: string) => speechInput(text, 'id');

  it('reads numbers the way Indonesian writes them', () => {
    expect(say('Lebih dari 10.000 tahun yang lalu.')).toBe('Lebih dari sepuluh ribu tahun yang lalu.');
    expect(say('sekitar 13,8 miliar tahun')).toBe('sekitar tiga belas koma delapan miliar tahun');
    expect(say('Sekitar 5.500 tahun lalu.')).toBe('Sekitar lima ribu lima ratus tahun lalu.');
    expect(say('pada tahun 1899 sebagai')).toBe('pada tahun seribu delapan ratus sembilan puluh sembilan sebagai');
  });

  it('keeps the sentence’s own commas and full stops out of the numbers', () => {
    expect(say('Pada tahun 1980, hanya sekitar 30.000 orang.')).toBe(
      'Pada tahun seribu sembilan ratus delapan puluh, hanya sekitar tiga puluh ribu orang.',
    );
    expect(say('Jumlahnya lebih dari 300.')).toBe('Jumlahnya lebih dari tiga ratus.');
    expect(say('butuh 12 menit, bukan 30, jadi')).toBe('butuh dua belas menit, bukan tiga puluh, jadi');
  });

  it('reads ordinals, decades, percentages and ranges', () => {
    expect(say('Pada Tahun ke-8, jalan baru dibuka.')).toBe('Pada Tahun kedelapan, jalan baru dibuka.');
    expect(say('Pada Tahun ke-15,')).toBe('Pada Tahun kelima belas,');
    expect(say('Pada tahun 1400-an, Johannes')).toBe('Pada tahun seribu empat ratusan, Johannes');
    expect(say('sekitar 50% warga')).toBe('sekitar lima puluh persen warga');
    expect(say('antara 10–20 tahun')).toBe('antara sepuluh sampai dua puluh tahun');
  });

  it('spells out letters and abbreviations, and drops what the voice can’t say', () => {
    expect(say('Perserikatan Bangsa-Bangsa (PBB) mengatakan')).toBe('Perserikatan Bangsa-Bangsa (pe be be) mengatakan');
    expect(say('huruf ML di kaleng')).toBe('huruf em el di kaleng');
    expect(say('Mina L. membawa beras')).toBe('Mina el membawa beras');
    expect(say('buku, pena, dll.')).toBe('buku, pena, dan lain-lain');
    expect(say('Café & Quran')).toBe('Cafe dan Kuran');
  });

  it('leaves no digit in any Indonesian lesson text', () => {
    const indonesian = listenUtterances().find((language) => language.lang === 'id');
    expect(indonesian).toBeDefined();
    for (const section of indonesian!.sections) {
      for (const piece of section.pieces) expect(say(piece.text), piece.text).not.toMatch(/\d/);
    }
  });
});

describe('speechInput, English', () => {
  it('leaves numbers to the voice and tidies the rest', () => {
    expect(speechInput('In 1980, only about 30,000 people lived  there.', 'en')).toBe('In 1980, only about 30,000 people lived there.');
    expect(speechInput('Ages 10–17 & up', 'en')).toBe('Ages 10 to 17 and up');
  });
});
