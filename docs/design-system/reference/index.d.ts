import type * as React from 'react';

export type StageId = 'read' | 'write' | 'speak' | 'watch' | 'reflect';
export type SectionId = 'history' | 'geography' | 'culture' | 'civics';
export type IconName =
  | 'BookOpen' | 'Pencil' | 'MessageCircle' | 'Play' | 'Pause' | 'RefreshCw' | 'RotateCcw' | 'Check' | 'ArrowRight' | 'ArrowLeft'
  | 'ChevronRight' | 'ChevronDown' | 'X' | 'Menu' | 'Plus' | 'Volume2' | 'Mic' | 'Square' | 'Trash2' | 'Wifi' | 'Type' | 'Lightbulb' | 'Clock' | 'Lock' | 'User' | 'Users'
  | 'Map' | 'Landmark' | 'Palette' | 'Scale' | 'HelpCircle' | 'ClipboardCheck' | 'NotebookPen' | 'GraduationCap' | 'Home' | 'Eye'
  | 'Download' | 'Printer' | 'Mail' | 'Globe' | 'Sprout' | 'Target' | 'Info' | 'WifiOff' | 'FileText' | 'Package' | 'Receipt'
  | 'ImageIcon' | 'Captions' | 'Hand' | 'Search' | 'LogOut';

/** Outline icon on a 24px grid; names follow Lucide. */
export interface IconProps { name: IconName; size?: number; label?: string; strokeWidth?: number; className?: string }
export declare function Icon(props: IconProps): React.ReactElement;

/** One primary (ink) button per view. */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'support' | 'lemon' | 'ghost'; size?: 'md' | 'lg'; icon?: IconName; iconRight?: IconName; block?: boolean; href?: string;
}
export declare function Button(props: ButtonProps): React.ReactElement;

/** Pill toggle for reading tools such as Listen. */
export interface ToolToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { icon?: IconName; pressed?: boolean; tone?: 'support' }
export declare function ToolToggle(props: ToolToggleProps): React.ReactElement;

/** Two to four mutually exclusive options, e.g. Standard | Simpler. */
export interface SegmentedControlProps { options: Array<string | { label: string; value: string; icon?: IconName }>; value?: string; onChange?: (value: string) => void; label?: string }
export declare function SegmentedControl(props: SegmentedControlProps): React.ReactElement;

/** One-tap choice pill or dashed sentence starter. */
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { selected?: boolean; role?: 'radio'; variant?: 'starter'; icon?: IconName }
export declare function Chip(props: ChipProps): React.ReactElement;

/** One or two words of status or category. */
export interface BadgeProps { tone?: 'lemon' | 'lavender' | 'outline' | 'correct' | 'retry' | 'ink' | SectionId; icon?: IconName; children?: React.ReactNode }
export declare function Badge(props: BadgeProps): React.ReactElement;

/** Mascot + wordmark, links home. */
export interface LogoProps { src: string; size?: number; wordmark?: boolean; href?: string }
export declare function Logo(props: LogoProps): React.ReactElement;

/** The reader mascot, floating gently. */
export interface MascotProps { src: string; size?: number; float?: boolean; alt?: string }
export declare function Mascot(props: MascotProps): React.ReactElement;

/** The yellow site header. */
export interface SiteHeaderProps { logoSrc: string; links?: Array<{ label: string; href?: string; icon?: IconName; active?: boolean }>; learner?: { name: string; tone?: string } | null; compact?: boolean; children?: React.ReactNode }
export declare function SiteHeader(props: SiteHeaderProps): React.ReactElement;

/** Read → Write → Speak → Watch → Reflect; never locked. */
export interface StagePathProps { current?: StageId; done?: StageId[]; orientation?: 'horizontal' | 'vertical'; sublabels?: Partial<Record<StageId, string>>; compact?: boolean }
export declare function StagePath(props: StagePathProps): React.ReactElement;

/** Five dots for a lesson's stage progress. */
export interface StageDotsProps { done?: StageId[]; current?: StageId }
export declare function StageDots(props: StageDotsProps): React.ReactElement;

export interface ProgressRingProps { value: number; max: number; size?: number; label?: string | null; ariaLabel?: string }
export declare function ProgressRing(props: ProgressRingProps): React.ReactElement;

export interface ProgressBarProps { value: number; max: number; label?: string; valueLabel?: string }
export declare function ProgressBar(props: ProgressBarProps): React.ReactElement;

export interface SectionBadgeProps { section: SectionId; number?: number; name?: string; showName?: boolean; size?: number }
export declare function SectionBadge(props: SectionBadgeProps): React.ReactElement;

export interface SectionHeaderProps { section: SectionId; number: number; title?: string; question?: string; completed?: number; total?: number; rounded?: boolean }
export declare function SectionHeader(props: SectionHeaderProps): React.ReactElement;

/** One lesson (or the section check) on the course page. */
export interface LessonRowProps { number?: number; title: string; question?: string; time?: string; status?: 'not-started' | 'in-progress' | 'completed'; done?: StageId[]; current?: StageId; highlight?: boolean; kind?: 'lesson' | 'quiz'; cta?: string; href?: string; meta?: string }
export declare function LessonRow(props: LessonRowProps): React.ReactElement;

export interface ContinueCardProps { title: string; eyebrow?: string; lessonLabel?: string; done?: StageId[]; current?: StageId; stageLabel?: string; cta?: string; href?: string }
export declare function ContinueCard(props: ContinueCardProps): React.ReactElement;

export interface TaskCardProps { eyebrow?: string; icon?: IconName; tone?: 'lavender'; children: React.ReactNode }
export declare function TaskCard(props: TaskCardProps): React.ReactElement;

export interface ReadingCardProps { part?: string; heading?: string; children: React.ReactNode }
export declare function ReadingCard(props: ReadingCardProps): React.ReactElement;

export interface GlossaryTermProps { word?: string; definition: string; example?: string; open?: boolean; children: React.ReactNode }
export declare function GlossaryTerm(props: GlossaryTermProps): React.ReactElement;

export interface DefinitionCardProps { word: React.ReactNode; definition: string; example?: string; floating?: boolean; listen?: boolean; onClose?: false | (() => void) }
export declare function DefinitionCard(props: DefinitionCardProps): React.ReactElement;

export interface EvidenceCardProps { kind?: 'object' | 'note' | 'document' | 'receipt' | 'drawing' | 'map'; title: string; items?: string[]; text?: string; quote?: boolean; fictional?: boolean }
export declare function EvidenceCard(props: EvidenceCardProps): React.ReactElement;

export interface ChoiceOptionProps { letter: string; state?: 'idle' | 'selected' | 'correct' | 'retry'; muted?: boolean; disabled?: boolean; children: React.ReactNode }
export declare function ChoiceOption(props: ChoiceOptionProps): React.ReactElement;

export interface FeedbackProps { tone?: 'correct' | 'retry'; title?: string; action?: React.ReactNode; children?: React.ReactNode }
export declare function Feedback(props: FeedbackProps): React.ReactElement;

export interface QuestionCardProps { id?: string; eyebrow?: string; prompt: string; options: string[]; selected?: number; result?: 'correct' | 'retry'; feedback?: string; children?: React.ReactNode }
export declare function QuestionCard(props: QuestionCardProps): React.ReactElement;

export interface WritingBoxProps { id?: string; label?: string; optional?: boolean; placeholder?: string; value?: string; rows?: number; helper?: string; dictate?: boolean | 'listening' }
export declare function WritingBox(props: WritingBoxProps): React.ReactElement;

export interface TextFieldProps { id?: string; label: string; optional?: boolean; placeholder?: string; value?: string; helper?: string }
export declare function TextField(props: TextFieldProps): React.ReactElement;

export interface VideoCardProps { title: string; channel?: string; duration?: string; captions?: string; language?: string; readLabel?: string; children?: React.ReactNode }
export declare function VideoCard(props: VideoCardProps): React.ReactElement;

export interface VoiceButtonProps { state?: 'idle' | 'listening'; stopLabel?: string; children?: React.ReactNode }
export declare function VoiceButton(props: VoiceButtonProps): React.ReactElement;

export interface ListenBarProps { state?: 'playing' | 'paused'; speed?: 'slow' | 'normal'; label?: string }
export declare function ListenBar(props: ListenBarProps): React.ReactElement;

export interface VoiceRecorderProps { state?: 'idle' | 'recording' | 'recorded'; time?: string; title?: string; note?: string; children?: React.ReactNode }
export declare function VoiceRecorder(props: VoiceRecorderProps): React.ReactElement;

export interface StatusBannerProps { tone?: 'offline' | 'back' | 'info'; icon?: string; title?: string; action?: string; children?: React.ReactNode }
export declare function StatusBanner(props: StatusBannerProps): React.ReactElement;

export interface MascotTipProps { src: string; size?: number; tone?: 'lavender' | 'lemon' | 'paper'; float?: boolean; children: React.ReactNode }
export declare function MascotTip(props: MascotTipProps): React.ReactElement;

export interface ScoreSummaryProps { skills: Array<{ name: string; got: number; of: number }> }
export declare function ScoreSummary(props: ScoreSummaryProps): React.ReactElement;

export interface LearnerTileProps { name: string; tone?: string; meta?: string; selected?: boolean; variant?: 'person' | 'new' | 'guest' }
export declare function LearnerTile(props: LearnerTileProps): React.ReactElement;

export interface JournalEntryProps { lessonNumber: number; lessonTitle: string; kind?: 'Writing' | 'Reflection'; prompt?: string; text: string; date?: string }
export declare function JournalEntry(props: JournalEntryProps): React.ReactElement;

export interface ActionBarProps { back?: string; next?: string; helper?: string; disabled?: boolean }
export declare function ActionBar(props: ActionBarProps): React.ReactElement;

declare global {
  interface Window {
    Thinkerwell: {
      Icon: typeof Icon; Button: typeof Button; ToolToggle: typeof ToolToggle; SegmentedControl: typeof SegmentedControl; Chip: typeof Chip; Badge: typeof Badge;
      Logo: typeof Logo; Mascot: typeof Mascot; SiteHeader: typeof SiteHeader; StagePath: typeof StagePath; StageDots: typeof StageDots;
      ProgressRing: typeof ProgressRing; ProgressBar: typeof ProgressBar; SectionBadge: typeof SectionBadge; SectionHeader: typeof SectionHeader;
      LessonRow: typeof LessonRow; ContinueCard: typeof ContinueCard; TaskCard: typeof TaskCard; ReadingCard: typeof ReadingCard;
      GlossaryTerm: typeof GlossaryTerm; DefinitionCard: typeof DefinitionCard; EvidenceCard: typeof EvidenceCard; ChoiceOption: typeof ChoiceOption;
      Feedback: typeof Feedback; QuestionCard: typeof QuestionCard; WritingBox: typeof WritingBox; TextField: typeof TextField; VideoCard: typeof VideoCard; VoiceButton: typeof VoiceButton; ListenBar: typeof ListenBar; VoiceRecorder: typeof VoiceRecorder; StatusBanner: typeof StatusBanner;
      MascotTip: typeof MascotTip; ScoreSummary: typeof ScoreSummary; LearnerTile: typeof LearnerTile; JournalEntry: typeof JournalEntry; ActionBar: typeof ActionBar;
    };
  }
}
