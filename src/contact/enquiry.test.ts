import { describe, expect, it } from 'vitest';
import { checkEnquiry, contactKind, MESSAGE_MAX, NAME_MAX } from './enquiry';

const good = { topic: 'organisation', name: 'Siti Rahma', contact: 'siti@example.org', message: 'We would like to use Thinkerwell with our learners.', website: '' };

describe('an enquiry', () => {
  it('accepts a complete enquiry, trimmed, with an email to reply to', () => {
    const checked = checkEnquiry({ ...good, name: '  Siti Rahma ', message: ` ${good.message}\n` });
    expect(checked).toEqual({ ok: true, value: { topic: 'organisation', name: 'Siti Rahma', contact: 'siti@example.org', message: good.message }, kind: 'email', bot: false });
  });

  it('accepts a WhatsApp number with its country code, as the team would dial it', () => {
    const checked = checkEnquiry({ ...good, contact: '+65 9123-4567' });
    expect(checked).toMatchObject({ ok: true, kind: 'whatsapp', value: { contact: '+6591234567' } });
  });

  it('says which fields need a change, and why', () => {
    expect(checkEnquiry({ topic: '', name: '', contact: '', message: '' })).toEqual({
      ok: false,
      errors: { topic: 'missing', name: 'missing', contact: 'missing', message: 'missing' },
    });
    expect(checkEnquiry({ ...good, topic: 'sales', name: 'S', contact: '91234567', message: 'Hi' })).toEqual({
      ok: false,
      errors: { topic: 'invalid', name: 'short', contact: 'invalid', message: 'short' },
    });
    expect(checkEnquiry({ ...good, name: 'x'.repeat(NAME_MAX + 1), message: 'x'.repeat(MESSAGE_MAX + 1) })).toEqual({
      ok: false,
      errors: { name: 'long', message: 'long' },
    });
  });

  it('refuses anything that could start a new email header, and unknown keys', () => {
    expect(checkEnquiry({ ...good, name: 'Siti\r\nBcc: someone@example.org' })).toMatchObject({ ok: false, errors: { name: 'invalid' } });
    expect(checkEnquiry({ ...good, contact: 'siti@example.org\nBcc: x@example.org' })).toMatchObject({ ok: false, errors: { contact: 'invalid' } });
    expect(checkEnquiry({ ...good, to: 'someone@example.org' })).toMatchObject({ ok: false });
    expect(checkEnquiry(null)).toMatchObject({ ok: false });
    expect(checkEnquiry([good])).toMatchObject({ ok: false });
  });

  it('keeps line breaks in a message', () => {
    expect(checkEnquiry({ ...good, message: 'Line one is here.\nLine two.' })).toMatchObject({ ok: true });
  });

  it('marks an enquiry whose hidden field was filled in as a bot', () => {
    expect(checkEnquiry({ ...good, website: 'http://spam.example' })).toMatchObject({ ok: true, bot: true });
  });
});

describe('a reply address', () => {
  it.each([
    ['name@example.org', 'email'],
    ['first.last+tag@school.edu.sg', 'email'],
    ['+62 812 3456 7890', 'whatsapp'],
    ['+60 (12) 345-6789', 'whatsapp'],
    ['+44 7700 900123', 'whatsapp'],
  ])('%s is %s', (contact, kind) => {
    expect(contactKind(contact)).toBe(kind);
  });

  it.each(['name@example', 'name example.org', '<a@b.co>', '081234567890', '+0812345678', '+12', 'call me', '@example.org'])('%s is neither', (contact) => {
    expect(contactKind(contact)).toBeNull();
  });
});
