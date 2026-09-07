"use client";

import { useMemo, useState } from "react";
import { placeholderPhotoDataUri } from "@/lib/ui";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";

export interface ArtQuizRound {
  artLabel: string;
  hex: string;
  correctTitle: string;
  choices: string[];
  /** the real uploaded image, when the art piece has one — falls back to a
   * generated placeholder tile otherwise. */
  imageUrl?: string;
}

export function ArtQuiz({ rounds }: { rounds: ArtQuizRound[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const round = rounds[index];
  const placeholderUri = useMemo(() => placeholderPhotoDataUri(round.artLabel, round.hex), [round]);
  const imageUri = round.imageUrl || placeholderUri;

  function next() {
    setIndex((i) => (i + 1) % rounds.length);
    setPicked(null);
  }

  return (
    <div className="space-y-5">
      <div
        className="mx-auto aspect-square w-full max-w-sm rounded-2xl border-4 border-[var(--color-art)] bg-cover bg-center"
        style={{ backgroundImage: `url("${imageUri}")` }}
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <p className="text-2xl font-bold">What&rsquo;s this piece called?</p>
        <ReadAloudButton text="What's this piece called?" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {round.choices.map((choice) => {
          const isPicked = picked === choice;
          const isCorrect = choice === round.correctTitle;
          const showState = picked !== null;
          return (
            <button
              key={choice}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(choice)}
              className="btn-lg w-full justify-center text-xl"
              style={{
                background: showState && isCorrect ? "var(--color-success)" : showState && isPicked ? "var(--color-art-tint)" : "var(--color-surface)",
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
        <div className="tile tile-accent-art space-y-3 p-5 text-center">
          <p className="text-xl font-semibold">
            {picked === round.correctTitle
              ? `That's right — it's ${round.correctTitle}!`
              : `This one is ${round.correctTitle}.`}
          </p>
          <button type="button" onClick={next} className="btn-lg btn-primary">
            Next piece <Icon name="arrowLeft" className="h-5 w-5 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
