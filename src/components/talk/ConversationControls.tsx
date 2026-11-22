"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitConversationAnswer, submitConversationAnother } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";
import { Icon } from "@/components/Icon";

/**
 * Under the conversation: where an answer is spoken, typed or tapped, and
 * where the senior sets the pace. The guide never goes on by itself —
 * "Ask me something else" and "Finish" are always there.
 *
 * mode "answer"     — the guide has asked something: answer box (voice or
 *                     keyboard), tappable choices when the question has them.
 * mode "checkpoint" — the guide has offered another question or saving: just
 *                     the two buttons.
 */
export function ConversationControls({
  conversationId,
  mode,
  choices,
}: {
  conversationId: string;
  mode: "answer" | "checkpoint";
  choices?: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Bumped after each saved answer so the answer box starts empty again.
  const [boxKey, setBoxKey] = useState(0);

  function run(action: (fd: FormData) => Promise<{ status: "ok" } | { status: "error"; message: string }>, extra: Record<string, string>) {
    setError(null);
    const fd = new FormData();
    fd.set("conversationId", conversationId);
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    startTransition(async () => {
      try {
        const result = await action(fd);
        if (result.status === "error") setError(result.message);
        else setBoxKey((k) => k + 1);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  const another = (label: string) => (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(submitConversationAnother, {})}
      className="btn-lg btn-secondary !min-h-0 !py-3 !px-5"
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {mode === "answer" && choices && choices.length > 0 && (
        <div className="flex flex-wrap gap-3" role="group" aria-label="Quick answers">
          {choices.map((c) => (
            <button
              key={c}
              type="button"
              disabled={pending}
              onClick={() => run(submitConversationAnswer, { answer: c })}
              className="btn-lg btn-secondary !min-h-0 !py-3 !px-5"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {mode === "answer" && (
        <form
          action={(formData) => run(submitConversationAnswer, { answer: String(formData.get("answer") || "") })}
          className="space-y-3"
        >
          <VoiceTextField
            key={boxKey}
            id="conversation-answer"
            name="answer"
            label={choices && choices.length > 0 ? "Or say it in your own words" : "Your answer"}
            placeholder="Tap the microphone to speak, or type here"
            rows={3}
          />
          <button type="submit" disabled={pending} className="btn-lg btn-primary">
            <Icon name="arrowRight" className="h-5 w-5" /> {pending ? "Sending…" : "Send"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4">
        {another(mode === "answer" ? "Ask me something else" : "Another question")}
        <Link href={`/talk/${conversationId}/finish`} className="btn-lg btn-secondary !min-h-0 !py-3 !px-5">
          <Icon name="check" className="h-5 w-5" /> Finish
        </Link>
      </div>
    </div>
  );
}
