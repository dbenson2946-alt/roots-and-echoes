"use client";

import { useRef, useState, useTransition } from "react";
import { submitConversationFinish } from "@/app/actions";
import { CATEGORY_META } from "@/lib/ui";
import type { MemoryCategory } from "@/lib/types";

/**
 * The end of a conversation: choose which answers to keep as a Story Time
 * memory (each is saved with the question it answered), or just finish and
 * keep nothing. Nothing from a conversation becomes a memory unless saved
 * here.
 */
export function FinishForm({
  conversationId,
  answers,
  defaultTitle,
  defaultCategory,
}: {
  conversationId: string;
  answers: { id: string; question: string; answer: string }[];
  defaultTitle: string;
  defaultCategory: MemoryCategory;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const intent = useRef<"1" | "0">("1");
  const field = "w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg";

  return (
    <form
      action={(formData) => {
        setError(null);
        formData.set("conversationId", conversationId);
        formData.set("save", intent.current);
        startTransition(async () => {
          try {
            // On success the action redirects, so only an error comes back.
            const result = await submitConversationFinish(formData);
            if (result && result.status === "error") setError(result.message);
          } catch (err) {
            // A redirect is thrown internally and handled by Next; anything else is a real failure.
            if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
            setError("Something went wrong. Please try again.");
          }
        });
      }}
      className="space-y-6"
    >
      <fieldset className="space-y-3">
        <legend className="mb-1 text-xl font-bold">Which answers would you like to keep?</legend>
        {answers.length === 0 ? (
          <p className="text-lg text-[var(--color-text-muted)]">There are no answers to save yet.</p>
        ) : (
          answers.map((a) => (
            <label key={a.id} className="tile tile-compact flex cursor-pointer items-start gap-3 p-4">
              <input
                type="checkbox"
                name="answerId"
                value={a.id}
                defaultChecked
                className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block text-base text-[var(--color-text-muted)]">{a.question}</span>
                <span className="block text-lg">{a.answer}</span>
              </span>
            </label>
          ))
        )}
      </fieldset>

      {answers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="memory-title" className="mb-1 block text-lg font-bold">
              Short title
            </label>
            <input id="memory-title" name="title" defaultValue={defaultTitle} className={field} />
          </div>
          <div>
            <label htmlFor="memory-category" className="mb-1 block text-lg font-bold">
              Topic
            </label>
            <select id="memory-category" name="category" defaultValue={defaultCategory} className={field}>
              {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_META[key].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {answers.length > 0 && (
        <p className="text-base text-[var(--color-text-muted)]">
          A saved memory goes into Story Time, where everyone who has access to the story can read it.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {answers.length > 0 && (
          <button
            type="submit"
            disabled={pending}
            onClick={() => (intent.current = "1")}
            className="btn-lg btn-primary"
          >
            {pending ? "Saving…" : "Save as a memory"}
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          formNoValidate
          onClick={() => (intent.current = "0")}
          className="btn-lg btn-secondary"
        >
          Finish without saving
        </button>
      </div>
    </form>
  );
}
