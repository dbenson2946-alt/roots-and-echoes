"use client";

import { useRef, useTransition } from "react";
import { submitNewArt } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";
import { ART_MEDIUM_META } from "@/lib/ui";
import type { ArtMedium } from "@/lib/types";

export function NewArtForm({ prompt }: { prompt: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await submitNewArt(formData);
          formRef.current?.reset();
        });
      }}
      className="tile tile-accent-art space-y-5 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-xl font-semibold text-[var(--color-art)]">
          <Icon name="thought" className="h-5 w-5" /> {prompt}
        </p>
        <ReadAloudButton text={prompt} />
      </div>
      <input type="hidden" name="prompt" value={prompt} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="art-title" className="mb-2 block text-xl font-bold">
            Title of the artwork
          </label>
          <input
            id="art-title"
            name="title"
            required
            placeholder="e.g. Water Lilies"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          />
        </div>
        <div>
          <label htmlFor="art-artist" className="mb-2 block text-xl font-bold">
            Artist (optional)
          </label>
          <input
            id="art-artist"
            name="artist"
            placeholder="e.g. Claude Monet"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          />
        </div>
      </div>

      <div>
        <label htmlFor="art-medium" className="mb-2 block text-xl font-bold">
          What kind of art is it?
        </label>
        <select
          id="art-medium"
          name="medium"
          defaultValue="painting"
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
        >
          {(Object.keys(ART_MEDIUM_META) as ArtMedium[]).map((key) => (
            <option key={key} value={key}>
              {ART_MEDIUM_META[key].label}
            </option>
          ))}
        </select>
      </div>

      <VoiceTextField
        id="art-note"
        name="personalNote"
        label="What made an impression on you? — type or speak"
        placeholder="Where did you see it? Who was with you? Why does it stick with you?"
        rows={5}
      />

      <button type="submit" disabled={pending} className="btn-lg btn-primary w-full sm:w-auto">
        {pending ? "Saving…" : "Save this artwork"}
      </button>
    </form>
  );
}
