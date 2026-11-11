import { describe, expect, it } from 'vitest';
import { gateFor, isValidOrgCode, normaliseOrgCode, pilotCodeFor, sharingOrg } from './gate';
import { STUDY_COLLECTION_PAUSED } from './paused';

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
    expect(gateFor(on, learner, false)).toEqual({ org: 'help-jakarta', pilotCode: 'HLP-01' });
    // No opt-in.
    expect(gateFor({ organisationCode: 'help-jakarta' }, learner, false)).toBeNull();
    expect(gateFor({ sharePilotResults: false, organisationCode: 'help-jakarta' }, learner, false)).toBeNull();
    // No organisation code, or a bad one.
    expect(gateFor({ sharePilotResults: true }, learner, false)).toBeNull();
    expect(gateFor({ sharePilotResults: true, organisationCode: '' }, learner, false)).toBeNull();
    expect(gateFor({ sharePilotResults: true, organisationCode: 'Help Jakarta' }, learner, false)).toBeNull();
    // No pilot code: a learner with a real name, a guest, nobody.
    expect(gateFor(on, { name: 'Amina' }, false)).toBeNull();
    expect(gateFor(on, null, false)).toBeNull();
    // Nothing set up at all.
    expect(gateFor(undefined, learner, false)).toBeNull();
    expect(gateFor({}, learner, false)).toBeNull();
  });

  it('the opt-in must be exactly true', () => {
    for (const value of [1, 'true', 'yes', {}, []]) {
      expect(sharingOrg({ sharePilotResults: value as unknown as boolean, organisationCode: 'help-jakarta' }, false)).toBeNull();
    }
  });

  it('sharingOrg needs no learner (sending needs only the device options)', () => {
    expect(sharingOrg(on, false)).toBe('help-jakarta');
    expect(sharingOrg({ sharePilotResults: true }, false)).toBeNull();
    expect(sharingOrg(null, false)).toBeNull();
  });

  it('is paused for everyone while study collection is retired (src/measurement/paused.ts)', () => {
    expect(STUDY_COLLECTION_PAUSED).toBe(true);
    // A device whose old preference is still "on", with a learner who has a pilot code.
    expect(gateFor(on, learner)).toBeNull();
    expect(sharingOrg(on)).toBeNull();
  });
});
