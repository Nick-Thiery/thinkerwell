/**
 * Shared type aliases for the design-system components. `StageId` and
 * `SectionId` already exist as the content layer's own types (they parse
 * content/course.json and content/lessons/*.json); components re-use them
 * rather than redefining a second copy that could drift.
 */
export type { StageId } from '../../content/stages';
export type { SectionId } from '../../content/schema';
export type { IconName } from './icons';

/** A design-system colour tone used across several components (Badge, Avatar tints, ...). */
export type Tone = 'lemon' | 'lavender' | 'outline' | 'correct' | 'retry' | 'ink';
