import { AlwaysEn, En } from '../../i18n';
import type { CourseText } from './usePlatformJournal';

/** A course's name or a lesson's title in the journal: marked as the lessons' language, or as English where it is English standing in for a translation. */
export function CourseTextSpan({ value }: { value: CourseText }) {
  return value.english ? <AlwaysEn>{value.text}</AlwaysEn> : <En>{value.text}</En>;
}
