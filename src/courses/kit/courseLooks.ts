/**
 * Each course's section tints and icons, by course id and section id. The
 * brand book has colours for Our World's four sections only, so every other
 * course's sections use the same four tints in order, each beside its own icon
 * and name, as the brand book asks. Icons come from the design system's set.
 *
 * Pure data with no imports (so the build's config loader can read it), so the course's content (a preview
 * chunk), the build's outline of the course (tools/outline/build.ts) and the
 * pages that list courses without loading them all read the one list.
 */
export const COURSE_SECTION_LOOKS = {
  'digital-world': {
    'thinking-machines': { tone: 'history', icon: 'Lightbulb' },
    'who-builds-ai': { tone: 'geography', icon: 'Globe' },
    'ai-in-daily-life': { tone: 'culture', icon: 'Users' },
    'truth-and-power': { tone: 'civics', icon: 'Scale' },
  },
  'southeast-asia-through-time': {
    'evidence-and-connections': { tone: 'history', icon: 'Search' },
    'trade-and-power': { tone: 'geography', icon: 'Package' },
    'war-and-independence': { tone: 'culture', icon: 'Landmark' },
    'memory-and-shared-histories': { tone: 'civics', icon: 'Users' },
  },
  'art-architecture-society': {
    'objects-making-power': { tone: 'history', icon: 'Palette' },
    'buildings-belief-places': { tone: 'geography', icon: 'Landmark' },
    'stories-lives-memory': { tone: 'culture', icon: 'BookOpen' },
    'museums-heritage-connections': { tone: 'civics', icon: 'Globe' },
  },
} as const;
