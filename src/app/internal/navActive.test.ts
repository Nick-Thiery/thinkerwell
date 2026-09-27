import { describe, expect, it } from 'vitest';
import { isNavLinkActive } from './navActive';

describe('isNavLinkActive', () => {
  it('marks Course on the course map, every lesson page and section checks', () => {
    for (const path of ['/course', '/lesson/towns-near-rivers/read', '/lesson/towns-near-rivers/complete', '/section/history/check']) {
      expect(isNavLinkActive('/course', path), path).toBe(true);
    }
    expect(isNavLinkActive('/course', '/')).toBe(false);
    expect(isNavLinkActive('/course', '/courses')).toBe(false);
  });

  it('marks other links only on their own page', () => {
    expect(isNavLinkActive('/', '/')).toBe(true);
    expect(isNavLinkActive('/', '/lesson/towns-near-rivers/read')).toBe(false);
    expect(isNavLinkActive('/journal', '/journal')).toBe(true);
  });
});
