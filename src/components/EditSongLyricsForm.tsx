"use client";

import { useState, useTransition } from "react";
import { submitEditSongLyrics } from "@/app/actions";
import { LyricsFileUpload } from "@/components/LyricsFileUpload";
import { Icon } from "@/components/Icon";

/** Lives on the song detail page, gated the same way every other write in
 * the app is (contribute permission). Doubles as "add lyrics" (no lyrics
 * yet) and "replace lyrics" (some already saved) — same component either
 * way, just a different opening button, since the save path is identical:
 * whatever ends up in the textarea replaces song.lyrics outright. */
export function EditSongLyricsForm({ songId, currentLyrics }: { songId: string; currentLyrics: string }) {
  const hasLyrics = currentLyrics.trim().length > 0;
  const [editing, setEditing] = useState(!hasLyrics);
  const [lyrics, setLyrics] = useState(currentLyrics);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setLyrics(currentLyrics);
          setSaved(false);
          setEditing(true);
        }}
        className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
      >
        <Icon name="edit" className="mr-1 inline h-4 w-4" /> Replace lyrics
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl bg-[var(--color-bg)] p-4">
      {!hasLyrics && (
        <p className="text-lg font-semibold">No lyrics saved for this song yet.</p>
      )}
      <textarea
        rows={6}
        value={lyrics}
        onChange={(e) => {
          setLyrics(e.target.value);
          setSaved(false);
        }}
        placeholder="Paste or type the lyrics you remember"
        aria-label="Lyrics"
        className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl leading-relaxed"
      />
      <LyricsFileUpload
        onExtracted={(text) => {
          setLyrics(text);
          setSaved(false);
        }}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const fd = new FormData();
              fd.set("songId", songId);
              fd.set("lyrics", lyrics);
              await submitEditSongLyrics(fd);
              setSaved(true);
            })
          }
          className="btn-lg btn-primary !min-h-0 !py-3 !px-5"
        >
          {pending ? "Saving…" : "Save lyrics"}
        </button>
        {hasLyrics && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(false)}
            className="btn-lg btn-secondary !min-h-0 !py-3 !px-5"
          >
            Cancel
          </button>
        )}
      </div>
      {saved && <p className="text-lg font-semibold text-[var(--color-success)]">Lyrics saved.</p>}
    </div>
  );
}
