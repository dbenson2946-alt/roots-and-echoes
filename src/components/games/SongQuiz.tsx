"use client";

import { useState } from "react";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";

export interface SongQuizRound {
  snippet: string;
  correctTitle: string;
  choices: string[];
}

export function SongQuiz({ rounds }: { rounds: SongQuizRound[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const round = rounds[index];

  function next() {
    setIndex((i) => (i + 1) % rounds.length);
    setPicked(null);
  }

  return (
    <div className="space-y-5">
      <div className="tile tile-accent-games space-y-3 p-6 text-center">
        <p className="text-lg font-semibold text-[var(--color-text-muted)]">A few words from a song&hellip;</p>
        <p className="whitespace-pre-wrap text-2xl italic leading-relaxed">&ldquo;{round.snippet}&rdquo;</p>
        <div className="flex justify-center">
          <ReadAloudButton text={round.snippet} />
        </div>
      </div>

      <p className="text-center text-2xl font-bold">Which song is this from?</p>

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
            {picked === round.correctTitle
              ? `That's it — "${round.correctTitle}"!`
              : `That was "${round.correctTitle}."`}
          </p>
          <button type="button" onClick={next} className="btn-lg btn-primary">
            Next song <Icon name="arrowLeft" className="h-5 w-5 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
