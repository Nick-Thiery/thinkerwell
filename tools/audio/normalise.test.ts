import { describe, expect, it } from 'vitest';
import { indonesianNumber, indonesianOrdinal, malayNumber, malayOrdinal, speechInput } from './normalise';
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

describe('malayNumber', () => {
  it.each([
    [0, 'kosong'],
    [8, 'lapan'],
    [11, 'sebelas'],
    [18, 'lapan belas'],
    [75, 'tujuh puluh lima'],
    [100, 'seratus'],
    [280, 'dua ratus lapan puluh'],
    [1000, 'seribu'],
    [1899, 'seribu lapan ratus sembilan puluh sembilan'],
    [2007, 'dua ribu tujuh'],
    [75000, 'tujuh puluh lima ribu'],
    [1000000, 'sejuta'],
    [2000000, 'dua juta'],
    [13800000000, 'tiga belas bilion lapan ratus juta'],
  ])('%i is "%s"', (n, words) => {
    expect(malayNumber(n)).toBe(words);
  });

  it('says ordinals', () => {
    expect(malayOrdinal(1)).toBe('pertama');
    expect(malayOrdinal(8)).toBe('kelapan');
    expect(malayOrdinal(15)).toBe('kelima belas');
  });
});

describe('speechInput, Malay', () => {
  const say = (text: string) => speechInput(text, 'ms');

  it('reads numbers the way Malaysian Malay writes them, like English', () => {
    expect(say('Lebih daripada 10,000 tahun dahulu.')).toBe('Lebih daripada sepuluh ribu tahun dahulu.');
    expect(say('kira-kira 13.8 bilion tahun')).toBe('kira-kira tiga belas perpuluhan lapan bilion tahun');
    expect(say('pada tahun 1899 sebagai')).toBe('pada tahun seribu lapan ratus sembilan puluh sembilan sebagai');
  });

  it('keeps the sentence’s own commas and full stops out of the numbers', () => {
    expect(say('Pada tahun 1980, hanya kira-kira 30,000 orang.')).toBe(
      'Pada tahun seribu sembilan ratus lapan puluh, hanya kira-kira tiga puluh ribu orang.',
    );
    expect(say('Jumlahnya lebih daripada 300.')).toBe('Jumlahnya lebih daripada tiga ratus.');
    expect(say('ambil 12 minit, bukan 30, jadi')).toBe('ambil dua belas minit, bukan tiga puluh, jadi');
  });

  it('reads ordinals, decades, percentages and ranges', () => {
    expect(say('Pada Tahun ke-8, jalan baharu dibuka.')).toBe('Pada Tahun kelapan, jalan baharu dibuka.');
    expect(say('Pada tahun 1400-an, Johannes')).toBe('Pada tahun seribu empat ratusan, Johannes');
    expect(say('kira-kira 50% penduduk')).toBe('kira-kira lima puluh peratus penduduk');
    expect(say('antara 10–20 tahun')).toBe('antara sepuluh hingga dua puluh tahun');
  });

  it('spells out letters and abbreviations as Malaysians say them', () => {
    expect(say('Pertubuhan Bangsa-Bangsa Bersatu (PBB) berkata')).toBe('Pertubuhan Bangsa-Bangsa Bersatu (pi bi bi) berkata');
    expect(say('huruf ML pada tin')).toBe('huruf em el pada tin');
    expect(say('Mina L. membawa beras')).toBe('Mina el membawa beras');
    expect(say('buku, pen, dll.')).toBe('buku, pen, dan lain-lain');
    expect(say('Café & kedai')).toBe('Cafe dan kedai');
  });

  it('leaves no digit in any Malay lesson text', () => {
    const malay = listenUtterances().find((language) => language.lang === 'ms');
    expect(malay).toBeDefined();
    for (const section of malay!.sections) {
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

describe('speechInput, Vietnamese', () => {
  const say = (text: string) => speechInput(text, 'vi');

  it('leaves numbers, years and units to the voice, which reads them in Vietnamese', () => {
    // VieNeu's own normaliser says "5.500" as "năm nghìn năm trăm", "13,8" as "mười ba phẩy tám",
    // "1899" as "một nghìn tám trăm chín mươi chín", "Năm 8" as "năm tám" and "10–17" as "mười đến mười bảy".
    for (const text of [
      'Khoảng 5.500 năm trước, người ở Lưỡng Hà dùng bánh xe.',
      'vũ trụ bắt đầu cách đây khoảng 13,8 tỉ năm.',
      'Nairobi bắt đầu vào năm 1899 như một điểm dừng.',
      'Vào Năm 8, một con đường mới được mở.',
      'Tuổi từ 10–17, nặng 3 kg, cách 5 km, 50% dân số.',
    ]) {
      expect(say(text)).toBe(text);
    }
  });

  it('tidies spaces, apostrophes inside names and the Italian caffè', () => {
    expect(say('khoảng\u00a013,8\u202ftỉ  năm')).toBe('khoảng 13,8 tỉ năm');
    expect(say("Ở Tassili n'Ajjer tại Algeria")).toBe('Ở Tassili nAjjer tại Algeria');
    expect(say('trong tiếng Ý caffè, rồi')).toBe('trong tiếng Ý café, rồi');
    expect(say('Caffè là')).toBe('Café là');
  });

  it('splits the clusters of Vietnamese spellings of foreign names into syllables', () => {
    expect(say('giữa hai con sông Ti-grơ và Ơ-phrát.')).toBe('giữa hai con sông Ti-gờ rơ và Ơ-phờ rát.');
    expect(say('Grơ')).toBe('Gờ rơ');
  });

  it('leaves English names and ordinary Vietnamese words alone', () => {
    const text = 'Hãy nhìn Bayview, Brookside, Tallgrass, Gutenberg, Pháp, Phước, trời, cờ, ML và Mina L.';
    expect(say(text)).toBe(text);
  });

  it('is stable', () => {
    const once = say("Ti-grơ n'Ajjer caffè");
    expect(say(once)).toBe(once);
  });

  it('keeps every number in the Vietnamese lessons in the form the voice reads', () => {
    const vietnamese = listenUtterances().find((language) => language.lang === 'vi');
    if (!vietnamese) return; // the Vietnamese preview's lessons live on their own branch until it is ready
    expect(vietnamese.sections.length).toBeGreaterThan(0);
    for (const section of vietnamese.sections) {
      for (const piece of section.pieces) {
        // Vietnamese writes 5.500 and 13,8; the voice would read 1,000 as "một" and 1.5 as "một chấm năm".
        expect(piece.speak, piece.text).not.toMatch(/\d,\d{3}(?!\d)|\d\.\d{1,2}(?!\d)/);
        expect(piece.speak, piece.text).not.toMatch(/\p{L}['’]\p{L}|[\u00a0\u202f]|caffè/iu);
        // A Vietnamese-spelt word starting with a foreign cluster ("grơ", "phrát") has been split.
        for (const word of piece.speak.match(/\p{L}+/gu) ?? []) {
          if (/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/iu.test(word)) expect(word, piece.text).not.toMatch(/^(?:ph|[bcdgkp])[rl]/i);
        }
      }
    }
  });
});
