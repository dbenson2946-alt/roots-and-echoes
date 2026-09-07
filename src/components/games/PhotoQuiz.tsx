"use client";

import { useMemo, useState } from "react";
import { placeholderPhotoDataUri } from "@/lib/ui";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";

export interface PhotoQuizRound {
  photoLabel: string;
  hex: string;
  correctName: string;
  choices: string[];
  /** the real uploaded photo, when it has one — falls back to a generated
   * placeholder tile otherwise. */
  imageUrl?: string;
}

export function PhotoQuiz({ rounds }: { rounds: PhotoQuizRound[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const round = rounds[index];
  const placeholderUri = useMemo(() => placeholderPhotoDataUri(round.photoLabel, round.hex), [round]);
  const imageUri = round.imageUrl || placeholderUri;

  function next() {
    setIndex((i) => (i + 1) % rounds.length);
    setPicked(null);
  }

  return (
    <div className="space-y-5">
      <div
        className="mx-auto aspect-square w-full max-w-sm rounded-2xl border-4 border-[var(--color-games)] bg-cover bg-center"
        style={{ backgroundImage: `url("${imageUri}")` }}
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <p className="text-2xl font-bold">Who&rsquo;s in this photo?</p>
        <ReadAloudButton text="Who's in this photo?" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {round.choices.map((choice) => {
          const isPicked = picked === choice;
          const isCorrect = choice === round.correctName;
          const showState = picked !== null;
          return (
            <button
              key={choice}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(choice)}
              className="btn-lg w-full justify-center text-xl"
              style={{
                background: showState && isCorrect ? "var(--color-success)" : showState && isPicked ? "var(--color-games-tint)" : "var(--color-surface)",
                color: showState && isCorrect ? "#fff" : "var(--color-text)",
                border: "2px solid var(--color-border)",
              }}
            >
              {choice}
              {showState && isCorrect ? <Icon name="check" className="ml-1 inline h-5 w-5" /> : ""}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="tile tile-accent-games space-y-3 p-5 text-center">
          <p className="text-xl font-semibold">
            {picked === round.correctName
              ? `That's right — it's ${round.correctName}!`
              : `This one is ${round.correctName}.`}
          </p>
          <button type="button" onClick={next} className="btn-lg btn-primary">
            Next photo <Icon name="arrowLeft" className="h-5 w-5 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
