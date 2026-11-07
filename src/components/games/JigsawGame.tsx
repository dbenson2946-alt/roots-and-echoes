"use client";

import { useEffect, useMemo, useState } from "react";
import { placeholderPhotoDataUri } from "@/lib/ui";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";
import { letterboxImageToSquare } from "@/lib/letterboxImageToSquare";

const GRID_SIZE = 3;
const PIECE_COUNT = GRID_SIZE * GRID_SIZE;
const SOLVED_ORDER = Array.from({ length: PIECE_COUNT }, (_, i) => i);
const INSTRUCTIONS = "Tap two pieces to swap them, until the picture is back together.";
// Matches --color-games-tint in globals.css (hardcoded here, same reason as
// PhotosPdfDocument.tsx's COLORS object — this runs in plain JS, not CSS) —
// used as the letterbox fill so a non-square photo's padding blends with
// the rest of this mode instead of introducing a new neutral color.
const GAMES_TINT = "#d8ebee";

function shuffledOrder(): number[] {
  const order = [...SOLVED_ORDER];
  do {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (order.every((v, i) => v === i));
  return order;
}

export function JigsawGame({
  photos,
}: {
  photos: { id: string; label: string; hex: string; imageUrl?: string }[];
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  // Start "solved" so server render and the client's first render match
  // exactly (Math.random() would otherwise differ between the two and
  // trigger a hydration mismatch) — shuffle only once mounted on the client.
  const [order, setOrder] = useState<number[]>(SOLVED_ORDER);
  const [selected, setSelected] = useState<number | null>(null);
  // The square, letterboxed version of the current photo, ready to be
  // sliced — null while that conversion is in progress. See
  // letterboxImageToSquare.ts for why this step exists: without it, a
  // non-square photo gets stretched (not cropped) to fill the square board.
  const [squareImageUri, setSquareImageUri] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(shuffledOrder());
  }, [photoIndex]);

  const photo = photos[photoIndex];
  const placeholderUri = useMemo(() => placeholderPhotoDataUri(photo.label, photo.hex), [photo]);
  const rawImageUri = photo.imageUrl || placeholderUri;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSquareImageUri(null);
    letterboxImageToSquare(rawImageUri, 600, GAMES_TINT)
      .then((uri) => {
        if (!cancelled) setSquareImageUri(uri);
      })
      .catch(() => {
        // Fall back to the raw image rather than leaving the puzzle stuck
        // loading forever — worst case a non-square photo is stretched the
        // old way, which beats showing nothing.
        if (!cancelled) setSquareImageUri(rawImageUri);
      });
    return () => {
      cancelled = true;
    };
  }, [rawImageUri]);

  const solved = order.every((v, i) => v === i);

  function handlePieceClick(slot: number) {
    if (solved) return;
    if (selected === null) {
      setSelected(slot);
      return;
    }
    if (selected === slot) {
      setSelected(null);
      return;
    }
    setOrder((prev) => {
      const next = [...prev];
      [next[selected], next[slot]] = [next[slot], next[selected]];
      return next;
    });
    setSelected(null);
  }

  function newPuzzle(samePhoto: boolean) {
    if (samePhoto) {
      setOrder(shuffledOrder());
      setSelected(null);
    } else {
      setPhotoIndex((i) => (i + 1) % photos.length);
      setSelected(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xl">{INSTRUCTIONS}</p>
        <ReadAloudButton text={INSTRUCTIONS} />
      </div>

      {squareImageUri ? (
        <div
          className="mx-auto grid aspect-square w-full max-w-md gap-1 overflow-hidden rounded-2xl border-4 border-[var(--color-games)] bg-[var(--color-games)] p-1"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {order.map((pieceIndex, slot) => {
            const col = pieceIndex % GRID_SIZE;
            const row = Math.floor(pieceIndex / GRID_SIZE);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => handlePieceClick(slot)}
                aria-label={`Puzzle piece, position ${slot + 1}`}
                aria-pressed={selected === slot}
                className="aspect-square rounded-lg outline-offset-[-4px]"
                style={{
                  backgroundImage: `url("${squareImageUri}")`,
                  backgroundSize: `${GRID_SIZE * 100}% ${GRID_SIZE * 100}%`,
                  backgroundPosition: `${(col / (GRID_SIZE - 1)) * 100}% ${(row / (GRID_SIZE - 1)) * 100}%`,
                  outline: selected === slot ? "4px solid var(--color-focus)" : "none",
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-2xl border-4 border-[var(--color-games)] bg-[var(--color-games-tint)] text-xl text-[var(--color-text-muted)]">
          Preparing puzzle…
        </div>
      )}

      {solved && (
        <p className="tile tile-accent-games p-4 text-center text-xl font-bold text-[var(--color-success)]">
          <Icon name="sparkle" className="mr-2 inline h-5 w-5" /> You did it! That&rsquo;s &ldquo;{photo.label}.&rdquo;
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => newPuzzle(true)} className="btn-lg btn-secondary">
          <Icon name="sliders" className="h-5 w-5" /> Shuffle again
        </button>
        {photos.length > 1 && (
          <button type="button" onClick={() => newPuzzle(false)} className="btn-lg btn-primary">
            <Icon name="photo" className="h-5 w-5" /> Try a different photo
          </button>
        )}
      </div>
    </div>
  );
}
