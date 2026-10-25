"use client";

import { useRef, useState, useTransition } from "react";
import { submitMemory } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { CATEGORY_META, MAX_AUDIO_UPLOAD_BYTES, formatFileSize } from "@/lib/ui";
import type { MemoryCategory } from "@/lib/types";

export function NewMemoryForm({
  prompt,
  defaultCategory,
}: {
  prompt: string;
  defaultCategory?: MemoryCategory;
}) {
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        if (recordedFile) formData.set("recordedAudioFile", recordedFile);
        startTransition(async () => {
          await submitMemory(formData);
          formRef.current?.reset();
          setRecordedFile(null);
          setUploadError(null);
        });
      }}
      className="tile tile-accent-story space-y-5 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xl font-semibold text-accent" style={{ color: "var(--color-story)" }}>{prompt}</p>
        <ReadAloudButton text={prompt} />
      </div>
      <input type="hidden" name="prompt" value={prompt} />

      <div>
        <label htmlFor="title" className="mb-2 block text-xl font-bold">
          Give this memory a short title
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="e.g. My first day at the factory"
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
        />
      </div>

      <VoiceTextField
        id="transcript"
        name="transcript"
        label="Tell the story — type or speak"
        placeholder="Take your time. Say as much or as little as you'd like."
        rows={6}
        required
      />

      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xl font-bold">Or record your voice</p>
          <AudioRecorder label="Record this memory" onRecordingReady={setRecordedFile} />
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
                setUploadError(`That file is ${formatFileSize(file.size)} — please choose one under 4MB.`);
                e.target.value = "";
              } else {
                setUploadError(null);
              }
            }}
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          />
          {uploadError && <p className="mt-1 text-base text-[var(--color-danger)]">{uploadError}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-2 block text-xl font-bold">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={defaultCategory ?? "other"}
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          >
            {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((key) => (
              <option key={key} value={key}>
                {CATEGORY_META[key].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="memoryDate" className="mb-2 block text-xl font-bold">
            When was this? (approximate is fine)
          </label>
          <input
            id="memoryDate"
            name="memoryDate"
            placeholder="e.g. Summer 1972"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn-lg btn-primary w-full sm:w-auto">
        {pending ? "Saving…" : "Save this memory"}
      </button>
    </form>
  );
}
