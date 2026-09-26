/**
 * Public entry for the design-system components (docs/design-system/README.md).
 * Import from 'src/components/ds' (e.g. '../components/ds').
 *
 * Every component ported from docs/design-system/reference/bundle.js is
 * re-exported here with its prop type, using the same names as
 * docs/design-system/reference/index.d.ts. Component files import their
 * shared foundations (Icon, cx, rovingFocus, types) by relative path
 * rather than through this file.
 */
export { Icon } from './Icon';
export type { IconProps } from './Icon';
export type { IconName, SectionId, StageId, Tone } from './types';

// Actions, forms and voice.
export { Button } from './Button';
export type { ButtonProps } from './Button';
export { ToolToggle } from './ToolToggle';
export type { ToolToggleProps } from './ToolToggle';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentedControlOption } from './SegmentedControl';
export { Chip } from './Chip';
export type { ChipProps } from './Chip';
export { WritingBox } from './WritingBox';
export type { WritingBoxProps } from './WritingBox';
export { VoiceButton } from './VoiceButton';
export type { VoiceButtonProps } from './VoiceButton';
export { ListenBar } from './ListenBar';
export type { ListenBarProps, ListenSpeed } from './ListenBar';
export { VoiceRecorder } from './VoiceRecorder';
export type { VoiceRecorderProps } from './VoiceRecorder';
export { ActionBar } from './ActionBar';
export type { ActionBarProps } from './ActionBar';

// Brand, chrome and progress.
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
export { Logo } from './Logo';
export type { LogoProps } from './Logo';
export { Mascot } from './Mascot';
export type { MascotProps } from './Mascot';
export { MascotTip } from './MascotTip';
export type { MascotTipProps } from './MascotTip';
export { SiteHeader } from './SiteHeader';
export type { SiteHeaderProps } from './SiteHeader';
export { StagePath } from './StagePath';
export type { StagePathProps } from './StagePath';
export { StageDots } from './StageDots';
export type { StageDotsProps } from './StageDots';
export { ProgressRing } from './ProgressRing';
export type { ProgressRingProps } from './ProgressRing';
export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

// Course and learner.
export { SectionBadge } from './SectionBadge';
export type { SectionBadgeProps } from './SectionBadge';
export { SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';
export { LessonRow } from './LessonRow';
export type { LessonRowProps } from './LessonRow';
export { ContinueCard } from './ContinueCard';
export type { ContinueCardProps } from './ContinueCard';
export { LearnerTile } from './LearnerTile';
export type { LearnerTileProps } from './LearnerTile';
export { JournalEntry } from './JournalEntry';
export type { JournalEntryProps } from './JournalEntry';
export { ScoreSummary } from './ScoreSummary';
export type { ScoreSummaryProps, ScoreSummarySkill } from './ScoreSummary';
export { StatusBanner } from './StatusBanner';
export type { StatusBannerProps } from './StatusBanner';

// Lesson content and quiz.
export { TaskCard } from './TaskCard';
export type { TaskCardProps } from './TaskCard';
export { ReadingCard } from './ReadingCard';
export type { ReadingCardProps } from './ReadingCard';
export { GlossaryTerm } from './GlossaryTerm';
export type { GlossaryTermProps } from './GlossaryTerm';
export { DefinitionCard } from './DefinitionCard';
export type { DefinitionCardProps } from './DefinitionCard';
export { EvidenceCard } from './EvidenceCard';
export type { EvidenceCardProps } from './EvidenceCard';
export { ChoiceOption } from './ChoiceOption';
export type { ChoiceOptionProps } from './ChoiceOption';
export { Feedback } from './Feedback';
export type { FeedbackProps } from './Feedback';
export { QuestionCard } from './QuestionCard';
export type { QuestionCardProps } from './QuestionCard';
export { TextField } from './TextField';
export type { TextFieldProps } from './TextField';
export { VideoCard } from './VideoCard';
export type { VideoCardProps } from './VideoCard';
