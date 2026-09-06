"use client";

import { useRef, useTransition } from "react";
import { submitCustomVoice } from "@/app/actions";
import { Icon } from "@/components/Icon";

export function NewCustomVoiceForm({ hasExisting }: { hasExisting: boolean }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await submitCustomVoice(formData);
          formRef.current?.reset();
        });
      }}
      className="tile tile-compact space-y-3"
    >
      <label className="block space-y-1">
        <span className="text-lg font-bold">
          {hasExisting ? "Replace the voice recording" : "Upload a voice recording"}
        </span>
        <input
          name="audioFile"
          type="file"
          accept="audio/*"
          required
          className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
          aria-label="Upload a voice recording"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-lg font-bold">Whose voice is this?</span>
        <input
          name="label"
          type="text"
          placeholder={'e.g. "Grandma\'s voice"'}
          className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
        />
      </label>
      <label className="flex items-start gap-3 text-lg">
        <input
          name="consent"
          type="checkbox"
          required
          className="mt-1 h-6 w-6 shrink-0 rounded border-2 border-[var(--color-border)]"
        />
        <span>I have permission to use this voice recording.</span>
      </label>
      <p className="text-base text-[var(--color-text-muted)]">
        Real voice cloning needs a paid service this demo isn&apos;t connected to yet — for now,
        your uploaded recording is saved, and read-aloud uses one of the browser&apos;s own voices
        as a stand-in.
      </p>
      <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-3 !px-5">
        <Icon name="upload" className="h-5 w-5" />
        {pending ? "Uploading…" : hasExisting ? "Replace voice" : "Upload voice"}
      </button>
    </form>
  );
}
