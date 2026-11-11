/**
 * The one switch that keeps coded study collection off (November 2026,
 * Justin's brief of 11 November: the public learning-study package was
 * retired while each pilot's plan, notices and permissions are agreed with
 * its organisation).
 *
 * While it is true:
 * - the app queues nothing and sends nothing, whatever a device's old
 *   "Share optional study data" preference says (src/measurement/gate.ts):
 *   the collector, queue and sender are not even downloaded;
 * - the server refuses every batch with 503, which also covers an older
 *   copy of the app still running from a device's offline cache
 *   (api/_lib/events.ts); the app backs off for hours on a 503
 *   (src/measurement/sender.ts).
 *
 * Nothing is deleted: saved preferences, a queue waiting on a device and
 * records already stored stay as they are. Turn this to false only when an
 * organisation's exact collection, notices and permissions are agreed and
 * built (docs/notes/pilot-measurement.md). No imports, so the server and
 * the app share it at no cost.
 */
export const STUDY_COLLECTION_PAUSED = true;
