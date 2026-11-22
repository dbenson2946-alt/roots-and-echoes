"use client";

import { useState, useTransition } from "react";
import { submitConversationDelete } from "@/app/actions";

/**
 * "Delete this conversation": a first tap asks "Delete it for good?" right
 * where the button was (no pop-up window), and a second tap does it. A memory
 * that was saved from the conversation is not touched.
 */
export function DeleteConversation({ conversationId, savedAsMemory }: { conversationId: string; savedAsMemory: boolean }) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    const formData = new FormData();
    formData.set("conversationId", conversationId);
    startTransition(async () => {
      try {
        // On success the action redirects, so only an error comes back.
        const result = await submitConversationDelete(formData);
        if (result && result.status === "error") setError(result.message);
      } catch (err) {
        if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
        setError("Something went wrong. Please try again.");
      }
    });
  }

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="btn-lg btn-secondary">
        Delete this conversation
      </button>
    );
  }

  return (
    <div className="tile space-y-3 p-5" role="group" aria-label="Delete this conversation?">
      <p className="text-xl font-semibold">Delete this conversation for good?</p>
      <p className="text-lg text-[var(--color-text-muted)]">
        {savedAsMemory
          ? "The memory you saved from it stays in Story Time."
          : "Nothing from it has been saved as a memory, so it will be gone completely. This can't be undone."}
      </p>
      {error && (
        <p role="alert" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={remove} disabled={pending} className="btn-lg btn-primary">
          {pending ? "Deleting…" : "Yes, delete it"}
        </button>
        <button type="button" onClick={() => setAsking(false)} disabled={pending} className="btn-lg btn-secondary">
          Keep it
        </button>
      </div>
    </div>
  );
}
