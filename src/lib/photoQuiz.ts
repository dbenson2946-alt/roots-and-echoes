/**
 * Round building for the "Who's in the Photo?" game — pure and
 * dependency-free so it can be unit-tested with a fixed random source.
 *
 * Every person tagged in a photo counts as a right answer (the senior too,
 * who is not a `people` row and so arrives here with their own id). A round
 * asks about one of them, chosen at random each time the game is opened, and
 * the wrong choices are only ever people who are NOT in the photo — so a
 * second person who really is in it can never be offered as a wrong answer.
 */

export interface QuizPerson {
  id: string;
  name: string;
}

export interface QuizPhoto {
  label: string;
  hex: string;
  imageUrl?: string;
  caption?: string;
  dateTaken?: string;
  /** Everyone tagged in the photo, the senior included when tagged. */
  inPhoto: QuizPerson[];
}

export interface PhotoQuizRound {
  photoLabel: string;
  hex: string;
  /** the real uploaded photo, when it has one — falls back to a generated
   * placeholder tile otherwise. */
  imageUrl?: string;
  caption?: string;
  dateTaken?: string;
  /** The person this round asks about (one of `inPhoto`). */
  answer: QuizPerson;
  inPhoto: QuizPerson[];
  /** The answer plus up to three people who are not in the photo, shuffled. */
  choices: QuizPerson[];
}

export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** "Anna", "Anna and Tom", "Anna, Tom and Margaret". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** One round per photo that has someone tagged and at least one person who
 * is not in it to offer as a wrong choice; rounds come back shuffled.
 * `everyone` is the whole circle, the senior included. */
export function buildQuizRounds(
  photos: QuizPhoto[],
  everyone: QuizPerson[],
  random: () => number = Math.random
): PhotoQuizRound[] {
  const rounds: PhotoQuizRound[] = [];
  for (const photo of photos) {
    if (photo.inPhoto.length === 0) continue;
    const inIds = new Set(photo.inPhoto.map((p) => p.id));
    const outsiders = shuffle(everyone.filter((p) => !inIds.has(p.id)), random);
    if (outsiders.length === 0) continue;
    const answer = photo.inPhoto[Math.floor(random() * photo.inPhoto.length)];
    rounds.push({
      photoLabel: photo.label,
      hex: photo.hex,
      imageUrl: photo.imageUrl,
      caption: photo.caption,
      dateTaken: photo.dateTaken,
      answer,
      inPhoto: photo.inPhoto,
      choices: shuffle([answer, ...outsiders.slice(0, 3)], random),
    });
  }
  return shuffle(rounds, random);
}
