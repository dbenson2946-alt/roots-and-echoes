"use client";

import { useState } from "react";
import Link from "next/link";
import { submitFamilyAnswer, submitFamilySkip } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";
import { Icon } from "@/components/Icon";
import { useServerAction } from "./useServerAction";

/** Answer a family question by voice or typing. "Not now" simply leaves it in
 * the list; "Skip this one" removes it (asked once more, in place). */
export function FamilyAnswerForm({ questionId }: { questionId: string }) {
  const { pending, error, run } = useServerAction();
  const [askingSkip, setAskingSkip] = useState(false);

  function skip() {
    const formData = new FormData();
    formData.set("questionId", questionId);
    run(submitFamilySkip, formData);
  }

  return (
    <div className="space-y-5">
      <form
        action={(formData) => {
          formData.set("questionId", questionId);
          run(submitFamilyAnswer, formData);
        }}
        className="space-y-3"
      >
        <VoiceTextField
          id="family-answer"
          name="answer"
          label="Your answer"
          placeholder="Tap the microphone to speak, or type here"
          rows={5}
          required
        />
        <button type="submit" disabled={pending} className="btn-lg btn-primary">
          <Icon name="arrowRight" className="h-5 w-5" /> {pending ? "Sending…" : "Send my answer"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4">
        <Link href="/talk" className="btn-lg btn-secondary !min-h-0 !py-3 !px-5">
          Not now
        </Link>
        {!askingSkip ? (
          <button type="button" onClick={() => setAskingSkip(true)} className="btn-lg btn-secondary !min-h-0 !py-3 !px-5">
            Skip this one
          </button>
        ) : (
          <div className="tile tile-compact flex flex-wrap items-center gap-3 p-3" role="group" aria-label="Skip this question?">
            <span className="text-lg font-semibold">Take it off the list?</span>
            <button type="button" onClick={skip} disabled={pending} className="btn-lg btn-primary !min-h-0 !py-2 !px-4">
              Yes, skip it
            </button>
            <button type="button" onClick={() => setAskingSkip(false)} disabled={pending} className="btn-lg btn-secondary !min-h-0 !py-2 !px-4">
              Keep it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
