"use client";

import { useRef, useState, useTransition } from "react";
import { submitLifeStoryRecording } from "@/app/actions";
import { uploadAudioDirect } from "@/lib/clientAudioUpload";
import { VoiceTextField } from "@/components/VoiceTextField";
import { AudioRecorder } from "@/components/AudioRecorder";
import { MAX_AUDIO_UPLOAD_BYTES, formatFileSize } from "@/lib/ui";

/**
 * The "Life Story Recordings" add-form — a second, separate capability on
 * Story Time, alongside (not mixed into) the prompted-memory flow above
 * it on the page. A title, a longer written summary (a soft 300-500 word
 * guideline shown live as the person types, not a hard limit), and one
 * or more audio clips, recorded live or uploaded. Mirrors NewMemoryForm's
 * audio-handling shape exactly, minus the category/prompt fields that
 * don't apply here.
 */
export function NewLifeStoryRecordingForm() {
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        const uploadedFile = formData.get("uploadedAudioFile");
        formData.delete("uploadedAudioFile");
        startTransition(async () => {
          try {
            if (recordedFile) {
              const recordedPath = await uploadAudioDirect(recordedFile);
              formData.set("recordedAudioPath", recordedPath);
            }
            if (uploadedFile instanceof File && uploadedFile.size > 0) {
              const uploadedPath = await uploadAudioDirect(uploadedFile);
              formData.set("uploadedAudioPath", uploadedPath);
              formData.set("uploadedAudioFileName", uploadedFile.name);
            }
            await submitLifeStoryRecording(formData);
            formRef.current?.reset();
            setRecordedFile(null);
            setUploadError(null);
          } catch (err) {
            setUploadError(err instanceof Error ? err.message : "That audio didn't upload.");
          }
        });
      }}
      className="tile tile-accent-story space-y-5 p-6"
    >
      <div>
        <label htmlFor="life-story-title" className="mb-2 block text-xl font-bold">
          Give this recording a title
        </label>
        <input
          id="life-story-title"
          name="title"
          required
          placeholder="e.g. Growing up on Elm Street"
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
        />
      </div>

      <div>
        <VoiceTextField
          id="life-story-summary"
          name="summary"
          label="A short summary of what's in this recording — type or speak"
          placeholder="Aim for around 300-500 words. What's covered, and what's it about?"
          rows={8}
          required
        />
        <p className="mt-1 text-base text-[var(--color-text-muted)]">
          Aim for roughly 300-500 words — just a friendly guideline, not a hard limit.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xl font-bold">Record the audio</p>
          <AudioRecorder label="Record this recording" onRecordingReady={setRecordedFile} />
        </div>
        <div>
          <p className="mb-2 text-lg font-semibold text-[var(--color-text-muted)]">
            Or upload an audio file instead
          </p>
          <input
            name="uploadedAudioFile"
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
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          />
          {uploadError && <p className="mt-1 text-base text-[var(--color-danger)]">{uploadError}</p>}
          <p className="mt-1 text-base text-[var(--color-text-muted)]">
            A long recording can be saved now and split into more parts later — see &ldquo;Add another part&rdquo; on the recording&rsquo;s own page.
          </p>
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn-lg btn-primary">
        {pending ? "Saving…" : "Save this recording"}
      </button>
    </form>
  );
}
