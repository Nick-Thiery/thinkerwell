/**
 * When pilot measurement may run at all (docs/notes/pilot-measurement.md).
 * Pure functions with no imports from the app, so they are tested alone and
 * cost almost nothing in the first visit.
 *
 * Results are queued only when ALL of these are true:
 *   1. the learner using the device has a pilot code (the name they typed is
 *      a code card's code, like HLP-01: never a real name);
 *   2. an educator turned on "Share pilot results" in Settings
 *      (settings.partner.sharePilotResults);
 *   3. an organisation code is set there (settings.partner.organisationCode).
 * Otherwise nothing is queued and nothing is sent. Look-around and nobody
 * chosen have no learner, so they never qualify.
 */
import { ORG_CODE_PATTERN, PILOT_CODE_PATTERN } from './codes';

/** The device-level options, as settings.partner holds them. */
export interface SharingSettings {
  sharePilotResults?: boolean;
  organisationCode?: string;
}

/** Who the events belong to. */
export interface Gate {
  org: string;
  pilotCode: string;
}

/** What an educator typed, made into the shape a code has: no spaces, lower case. */
export function normaliseOrgCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

export function isValidOrgCode(code: string): boolean {
  return ORG_CODE_PATTERN.test(code);
}

/** The learner's pilot code, if the name they typed is one (HLP-01, hlp-01 or " HLP-01 "), else null. */
export function pilotCodeFor(learner: { name: string } | null | undefined): string | null {
  if (!learner) return null;
  const code = learner.name.trim().toUpperCase();
  return PILOT_CODE_PATTERN.test(code) ? code : null;
}

/** The organisation's code when this device is set to share results (turned on, with a valid code), else null. */
export function sharingOrg(partner: SharingSettings | null | undefined): string | null {
  if (!partner || partner.sharePilotResults !== true) return null;
  const org = partner.organisationCode;
  return typeof org === 'string' && isValidOrgCode(org) ? org : null;
}

/** All three conditions: the gate for this learner on this device, or null. */
export function gateFor(partner: SharingSettings | null | undefined, learner: { name: string } | null | undefined): Gate | null {
  const org = sharingOrg(partner);
  const pilotCode = pilotCodeFor(learner);
  return org && pilotCode ? { org, pilotCode } : null;
}
