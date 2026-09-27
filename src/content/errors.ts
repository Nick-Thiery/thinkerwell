/** A problem with the content files (content/*.json). */
export class ContentError extends Error {
  override name = 'ContentError';
}
