"use client";

import { useRef, useState, useTransition } from "react";
import { submitNewSong } from "@/app/actions";
import { uploadAudioDirect } from "@/lib/clientAudioUpload";
import { VoiceTextField } from "@/components/VoiceTextField";
import { LyricsFileUpload } from "@/components/LyricsFileUpload";
import { MAX_AUDIO_UPLOAD_BYTES, formatFileSize } from "@/lib/ui";

export function NewSongForm() {
  const [pending, startTransition] = useTransition();
  const [lyrics, setLyrics] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formData.set("lyrics", lyrics);
        setUploadError(null);
        startTransition(async () => {
          const file = formData.get("audioFile");
          formData.delete("audioFile");
          try {
            if (file instanceof File && file.size > 0) {
              const audioPath = await uploadAudioDirect(file);
              formData.set("audioPath", audioPath);
            }
            await submitNewSong(formData);
            formRef.current?.reset();
            setLyrics("");
          } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Something went wrong saving the song.");
          }
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

      <div className="space-y-2">
        <label htmlFor="song-lyrics" className="mb-2 block text-xl font-bold">
          Lyrics (optional)
        </label>
        <textarea
          id="song-lyrics"
          rows={4}
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Paste or type the lyrics you remember"
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl leading-relaxed"
        />
        <LyricsFileUpload onExtracted={setLyrics} />
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
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.size > MAX_AUDIO_UPLOAD_BYTES) {
              setUploadError(`That file is ${formatFileSize(file.size)} — please choose one under ${formatFileSize(MAX_AUDIO_UPLOAD_BYTES)}.`);
              e.target.value = "";
            } else {
              setUploadError(null);
            }
          }}
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-lg"
        />
        <p className="mt-1 text-base text-[var(--color-text-muted)]">
          Add the actual recording so you can ask for this song by name later and hear it play.
        </p>
      </div>

      {uploadError && (
        <p role="status" className="text-lg text-[var(--color-danger)]">
          {uploadError}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-lg btn-primary w-full sm:w-auto">
        {pending ? "Saving…" : "Save this song"}
      </button>
    </form>
  );
}
