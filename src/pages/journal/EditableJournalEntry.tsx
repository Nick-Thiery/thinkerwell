import { useState } from 'react';
import { Badge, Button, JournalEntry, WritingBox } from '../../components/ds';
import type { Lesson } from '../../content';
import { useI18n } from '../../i18n';
import { useLearnerSession } from '../../session';
import { getStore, type JournalPiece, type LessonProgress } from '../../storage';
import './EditableJournalEntry.css';

interface EditableJournalEntryProps {
  lesson: Lesson;
  piece: JournalPiece;
  /** The whole "saved" line, already in the interface's language ("Saved today", "Saved Sep 20"). */
  savedLabel?: string;
  /** Called with the lesson's updated record once a save succeeds, so the page can show it right away. */
  onSaved: (lessonId: string, record: LessonProgress) => void;
}

/**
 * One journal piece (docs/design-system/components/JournalEntry.md: "editing
 * updates it, it never duplicates"). Shows the read-only `JournalEntry` until
 * its Edit button is pressed, then swaps in a `WritingBox` with Save and
 * Cancel, writing the change straight back to the same slot it came from
 * (lesson.write.text, or reflections[reflectionIndex]).
 *
 * Look-around has no journal to edit (the page never renders this then), so
 * this always has a real learner to save under.
 */
export function EditableJournalEntry({ lesson, piece, savedLabel, onSaved }: EditableJournalEntryProps) {
  const { t, contentLang } = useI18n();
  const { activeLearner } = useLearnerSession();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(piece.text);
  const [saving, setSaving] = useState(false);

  const isReflection = piece.kind === 'reflection';
  const stageLabel = t(isReflection ? 'stages.reflect' : 'stages.write');
  const kindLabel = isReflection ? 'Reflection' : 'Writing';

  if (!editing) {
    return (
      <JournalEntry
        lessonNumber={lesson.number}
        lessonTitle={stageLabel}
        kind={kindLabel}
        prompt={piece.prompt}
        text={piece.text}
        savedLabel={savedLabel}
        onEdit={() => {
          setDraft(piece.text);
          setEditing(true);
        }}
      />
    );
  }

  async function save(): Promise<void> {
    const learnerId = activeLearner?.id;
    if (!learnerId || !draft.trim()) return;
    setSaving(true);
    try {
      const store = await getStore();
      const record = await store.updateProgress(learnerId, lesson.id, (current) =>
        isReflection
          ? { ...current, reflections: { ...current.reflections, [piece.reflectionIndex!]: draft } }
          : { ...current, writing: { ...current.writing, text: draft } },
      );
      onSaved(lesson.id, record);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="tw-entry tw-entry-editing">
      <div className="tw-entry-head">
        <span className="tw-entry-lesson">{t('ds.course.journalEntry.lessonLine', { number: lesson.number, title: stageLabel })}</span>
        <Badge tone={isReflection ? 'lavender' : 'lemon'} icon={isReflection ? 'RefreshCw' : 'Pencil'}>
          {t(isReflection ? 'ds.course.journalEntry.kindReflection' : 'ds.course.journalEntry.kindWriting')}
        </Badge>
      </div>
      {piece.prompt ? (
        <p className="tw-entry-prompt" {...contentLang}>
          {piece.prompt}
        </p>
      ) : null}
      <WritingBox aria-label={piece.prompt || stageLabel} value={draft} onValueChange={setDraft} rows={4} disabled={saving} />
      <div className="tw-entry-foot tw-entry-edit-actions">
        <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          {t('pages.journal.cancelEdit')}
        </Button>
        <Button variant="secondary" onClick={() => void save()} disabled={saving || !draft.trim()}>
          {t('pages.journal.saveEdit')}
        </Button>
      </div>
    </article>
  );
}
