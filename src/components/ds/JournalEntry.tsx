import { useI18n } from '../../i18n';
import { Badge } from './Badge';
import { Button } from './Button';
import { cx } from './internal/cx';
import './JournalEntry.css';

export interface JournalEntryProps {
  lessonNumber: number;
  lessonTitle: string;
  kind?: 'Writing' | 'Reflection';
  prompt?: string;
  text: string;
  date?: string;
  className?: string;
  /** Not in the reference's index.d.ts; added so a caller (phase 3) can wire the Edit button up. */
  onEdit?: () => void;
}

/**
 * One saved piece of writing or reflection in My journal, with its lesson
 * and prompt (docs/design-system/components/JournalEntry.md). One entry per
 * lesson and stage: editing updates it, it never duplicates.
 */
export function JournalEntry({
  lessonNumber,
  lessonTitle,
  kind,
  prompt,
  text,
  date,
  className,
  onEdit,
}: JournalEntryProps) {
  const { t } = useI18n();
  const isReflection = kind === 'Reflection';
  const kindLabel = t(isReflection ? 'ds.course.journalEntry.kindReflection' : 'ds.course.journalEntry.kindWriting');
  return (
    <article className={cx('tw-entry', className)}>
      <div className="tw-entry-head">
        <span className="tw-entry-lesson">
          {t('ds.course.journalEntry.lessonLine', { number: lessonNumber, title: lessonTitle })}
        </span>
        <Badge tone={isReflection ? 'lavender' : 'lemon'} icon={isReflection ? 'RefreshCw' : 'Pencil'}>
          {kindLabel}
        </Badge>
      </div>
      {prompt ? <p className="tw-entry-prompt">{prompt}</p> : null}
      <p className="tw-entry-text">{text}</p>
      <div className="tw-entry-foot">
        <span>{date ? t('ds.course.journalEntry.saved', { date }) : ''}</span>
        <Button variant="ghost" icon="Pencil" onClick={onEdit}>
          {t('ds.course.journalEntry.edit')}
        </Button>
      </div>
    </article>
  );
}
