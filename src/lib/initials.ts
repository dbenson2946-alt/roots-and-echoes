/**
 * The letters shown in a person's circle (family tree, account switcher,
 * PDF exports): the first letter of the first name and of the last name —
 * "Mary Ann Smith" → "MS", "Mary Smith" → "MS", "Mom" → "M". Always worked
 * out from the name as it is *now* rather than saved, so a person whose
 * name is edited (a maiden name changed to a married one, say) never keeps
 * the old letters.
 *
 * Pure and dependency-free so server code, the live pages and the PDF
 * renderer can all share one definition.
 */
export function initialsForName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  // Array.from keeps a first character that is outside the basic plane
  // (an emoji, say) in one piece instead of splitting it in half.
  const firstLetter = (word: string) => Array.from(word)[0] ?? "";
  const letters =
    words.length === 1 ? firstLetter(words[0]) : firstLetter(words[0]) + firstLetter(words[words.length - 1]);
  return letters.toUpperCase() || "?";
}
