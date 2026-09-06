"use client";

import { useRef, useState, useTransition } from "react";
import { submitMemory } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { CATEGORY_META } from "@/lib/ui";
import type { MemoryCategory } from "@/lib/types";

export function NewMemoryForm({ prompt }: { prompt: string }) {
  const [hasAudio, setHasAudio] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await submitMemory(formData);
          formRef.current?.reset();
          setHasAudio(false);
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

      <div>
        <p className="mb-2 text-xl font-bold">Or record your voice</p>
        <AudioRecorder label="Record this memory" onRecordingReady={() => setHasAudio(true)} />
        <input type="hidden" name="hasAudio" value={hasAudio ? "true" : "false"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-2 block text-xl font-bold">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue="other"
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
