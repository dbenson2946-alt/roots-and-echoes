"use client";

import { useRef, useTransition } from "react";
import { submitNewSong } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";

export function NewSongForm() {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await submitNewSong(formData);
          formRef.current?.reset();
        });
      }}
      className="tile tile-accent-music space-y-5 p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="song-title" className="mb-2 block text-xl font-bold">
            Song title
          </label>
          <input
            id="song-title"
            name="title"
            required
            placeholder="e.g. Unforgettable"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          />
        </div>
        <div>
          <label htmlFor="song-artist" className="mb-2 block text-xl font-bold">
            Artist (optional)
          </label>
          <input
            id="song-artist"
            name="artist"
            placeholder="e.g. Nat King Cole"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          />
        </div>
      </div>

      <div>
        <label htmlFor="song-lyrics" className="mb-2 block text-xl font-bold">
          Lyrics (optional)
        </label>
        <textarea
          id="song-lyrics"
          name="lyrics"
          rows={4}
          placeholder="Paste or type the lyrics you remember"
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl leading-relaxed"
        />
      </div>

      <VoiceTextField
        id="song-note"
        name="personalNote"
        label="What does this song mean to you? — type or speak"
        placeholder="Where were you when you first heard it? Who does it remind you of?"
        rows={4}
      />

      <div>
        <label htmlFor="song-audio" className="mb-2 block text-xl font-bold">
          Upload the song to play (optional)
        </label>
        <input
          id="song-audio"
          name="audioFile"
          type="file"
          accept="audio/*"
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-lg"
        />
        <p className="mt-1 text-base text-[var(--color-text-muted)]">
          Add the actual recording so you can ask for this song by name later and hear it play.
        </p>
      </div>

      <button type="submit" disabled={pending} className="btn-lg btn-primary w-full sm:w-auto">
        {pending ? "Saving…" : "Save this song"}
      </button>
    </form>
  );
}
