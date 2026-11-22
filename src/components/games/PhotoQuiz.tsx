"use client";

import { useMemo, useState } from "react";
import { placeholderPhotoDataUri } from "@/lib/ui";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";
import { joinNames, type PhotoQuizRound } from "@/lib/photoQuiz";

export function PhotoQuiz({ rounds }: { rounds: PhotoQuizRound[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null); // a person id

  const round = rounds[index];
  const placeholderUri = useMemo(() => placeholderPhotoDataUri(round.photoLabel, round.hex), [round]);
  const imageUri = round.imageUrl || placeholderUri;

  // The photo's date and description, shown after an answer to help the
  // memory come back ("Summer 1962 · Everyone at the lake").
  const detail = [round.dateTaken, round.caption].filter(Boolean).join(" · ");

  function next() {
    setIndex((i) => (i + 1) % rounds.length);
    setPicked(null);
  }

  return (
    <div className="space-y-5">
      {/* bg-contain (not bg-cover) — the whole photo stays visible, with
          the games tint filling any leftover space, rather than cropping
          whoever's standing at the edges of a non-square photo. */}
      <div
        className="mx-auto aspect-square w-full max-w-sm rounded-2xl border-4 border-[var(--color-games)] bg-[var(--color-games-tint)] bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${imageUri}")` }}
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <p className="text-2xl font-bold">Who&rsquo;s in this photo?</p>
        <ReadAloudButton text="Who's in this photo?" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {round.choices.map((choice) => {
          const isPicked = picked === choice.id;
          const isCorrect = choice.id === round.answer.id;
          const showState = picked !== null;
          return (
            <button
              key={choice.id}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(choice.id)}
              className="btn-lg w-full justify-center text-xl"
              style={{
                background: showState && isCorrect ? "var(--color-success)" : showState && isPicked ? "var(--color-games-tint)" : "var(--color-surface)",
                color: showState && isCorrect ? "#fff" : "var(--color-text)",
                border: "2px solid var(--color-border)",
              }}
            >
              {choice.name}
              {showState && isCorrect ? <Icon name="check" className="ml-1 inline h-5 w-5" /> : ""}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="tile tile-accent-games space-y-3 p-5 text-center">
          <p className="text-xl font-semibold">{revealText(round, picked)}</p>
          {detail && <p className="text-lg text-[var(--color-text-muted)]">{detail}</p>}
          <button type="button" onClick={next} className="btn-lg btn-primary">
            Next photo <Icon name="arrowLeft" className="h-5 w-5 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Never says "wrong": a right pick is celebrated and the rest of the group
 * named; any other pick is simply told who is in the photo. */
function revealText(round: PhotoQuizRound, pickedId: string): string {
  const others = round.inPhoto.filter((p) => p.id !== round.answer.id).map((p) => p.name);
  if (pickedId === round.answer.id) {
    const base = `That's right — ${round.answer.name} is in this photo!`;
    if (others.length === 0) return base;
    return `${base} ${joinNames(others)} ${others.length > 1 ? "are" : "is"} in it too.`;
  }
  return `This photo shows ${joinNames(round.inPhoto.map((p) => p.name))}.`;
}
