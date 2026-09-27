import type { IconName, SectionId } from '../../components/ds';

/**
 * The icon for each section, matching the mapping the ds SectionHeader and
 * SectionBadge components use internally (not exported from either, so this
 * is its own small, stable copy) — used for the phone section chips, which
 * render plain anchors rather than the Chip component (see CoursePage.tsx).
 */
export const SECTION_ICONS: Record<SectionId, IconName> = {
  history: 'Landmark',
  geography: 'Map',
  culture: 'Palette',
  civics: 'Scale',
};
