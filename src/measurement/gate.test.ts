import { describe, expect, it } from 'vitest';
import { gateFor, isValidOrgCode, normaliseOrgCode, pilotCodeFor, sharingOrg } from './gate';

describe('pilotCodeFor', () => {
  it('reads a code card code typed as the name', () => {
    expect(pilotCodeFor({ name: 'HLP-01' })).toBe('HLP-01');
    expect(pilotCodeFor({ name: ' hlp-01 ' })).toBe('HLP-01');
    expect(pilotCodeFor({ name: 'AB-123' })).toBe('AB-123');
    expect(pilotCodeFor({ name: 'MYPAR-07' })).toBe('MYPAR-07');
  });

  it('never takes a real name', () => {
    for (const name of ['Amina', 'Amina R', 'HLP', 'HLP-1', 'HLP-0001', 'ABCDEF-01', 'HLP 01', 'HLP-01 Amina', '', '  ']) {
      expect(pilotCodeFor({ name }), name).toBeNull();
    }
  });

  it('has nobody without a learner', () => {
    expect(pilotCodeFor(null)).toBeNull();
    expect(pilotCodeFor(undefined)).toBeNull();
  });
});

describe('organisation codes', () => {
  it('turns what an educator typed into a code', () => {
    expect(normaliseOrgCode('  Help Jakarta ')).toBe('help-jakarta');
    expect(normaliseOrgCode('My-Partner')).toBe('my-partner');
  });

  it('accepts short lower-case codes with hyphens', () => {
    for (const code of ['help-jakarta', 'my-partner', 'ab', 'a1-b2']) expect(isValidOrgCode(code), code).toBe(true);
    for (const code of ['', 'a', 'Help', '-ab', 'a b', 'a_b', 'x'.repeat(33)]) expect(isValidOrgCode(code), code).toBe(false);
  });
});

describe('the gate', () => {
  const learner = { name: 'HLP-01' };
  const on = { sharePilotResults: true, organisationCode: 'help-jakarta' };

  it('opens only with all three: a pilot code, the opt-in and an organisation code', () => {
    expect(gateFor(on, learner)).toEqual({ org: 'help-jakarta', pilotCode: 'HLP-01' });
    // No opt-in.
    expect(gateFor({ organisationCode: 'help-jakarta' }, learner)).toBeNull();
    expect(gateFor({ sharePilotResults: false, organisationCode: 'help-jakarta' }, learner)).toBeNull();
    // No organisation code, or a bad one.
    expect(gateFor({ sharePilotResults: true }, learner)).toBeNull();
    expect(gateFor({ sharePilotResults: true, organisationCode: '' }, learner)).toBeNull();
    expect(gateFor({ sharePilotResults: true, organisationCode: 'Help Jakarta' }, learner)).toBeNull();
    // No pilot code: a learner with a real name, a guest, nobody.
    expect(gateFor(on, { name: 'Amina' })).toBeNull();
    expect(gateFor(on, null)).toBeNull();
    // Nothing set up at all.
    expect(gateFor(undefined, learner)).toBeNull();
    expect(gateFor({}, learner)).toBeNull();
  });

  it('the opt-in must be exactly true', () => {
    for (const value of [1, 'true', 'yes', {}, []]) {
      expect(sharingOrg({ sharePilotResults: value as unknown as boolean, organisationCode: 'help-jakarta' })).toBeNull();
    }
  });

  it('sharingOrg needs no learner (sending needs only the device options)', () => {
    expect(sharingOrg(on)).toBe('help-jakarta');
    expect(sharingOrg({ sharePilotResults: true })).toBeNull();
    expect(sharingOrg(null)).toBeNull();
  });
});
