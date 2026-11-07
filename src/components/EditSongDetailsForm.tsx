"use client";

import { useState, useTransition } from "react";
import { submitEditSongDetails } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";
import { Icon } from "@/components/Icon";

/** Lives on the song detail page, gated the same way every other write in
 * the app is (contribute permission). Closes the same gap §22 closed for
 * lyrics — until now, title/artist/personal note could only ever be set
 * once, at creation, with no way to go back and change them. */
export function EditSongDetailsForm({
  songId,
  title,
  artist,
  personalNote,
}: {
  songId: string;
  title: string;
  artist: string;
  personalNote: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  // VoiceTextField owns its own internal state (it needs to, for the
  // speech-to-text dictation to work), so it's reset via `key` on cancel
  // rather than a controlled value — bumping this remounts it with the
  // original personalNote as its fresh defaultValue.
  const [resetKey, setResetKey] = useState(0);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
      >
        <Icon name="edit" className="mr-1 inline h-4 w-4" /> Edit song details
      </button>
    );
  }

  return (
    <form
      className="space-y-4 rounded-xl bg-[var(--color-bg)] p-4"
      action={(formData) => {
        startTransition(async () => {
          formData.set("songId", songId);
          await submitEditSongDetails(formData);
          setSaved(true);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`edit-song-title-${songId}`} className="mb-2 block text-lg font-bold">
            Song title
          </label>
          <input
            id={`edit-song-title-${songId}`}
            name="title"
            required
            defaultValue={title}
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
          />
        </div>
        <div>
          <label htmlFor={`edit-song-artist-${songId}`} className="mb-2 block text-lg font-bold">
            Artist (optional)
          </label>
          <input
            id={`edit-song-artist-${songId}`}
            name="artist"
            defaultValue={artist}
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
          />
        </div>
      </div>

      <VoiceTextField
        key={resetKey}
        id={`edit-song-note-${songId}`}
        name="personalNote"
        label="What does this song mean to you? — type or speak"
        defaultValue={personalNote}
        rows={4}
      />

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-3 !px-5">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setResetKey((k) => k + 1);
            setSaved(false);
            setEditing(false);
          }}
          className="btn-lg btn-secondary !min-h-0 !py-3 !px-5"
        >
          Cancel
        </button>
      </div>

      {saved && <p className="text-lg font-semibold text-[var(--color-success)]">Saved.</p>}
    </form>
  );
}
