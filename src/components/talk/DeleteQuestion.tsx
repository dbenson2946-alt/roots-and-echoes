"use client";

import { useState } from "react";
import { submitFamilyDelete } from "@/app/actions";
import { useServerAction } from "./useServerAction";

/** "Take this question back" / "Delete": asked once more in place (no pop-up). */
export function DeleteQuestion({ questionId, label }: { questionId: string; label: string }) {
  const [asking, setAsking] = useState(false);
  const { pending, error, run } = useServerAction();

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="btn-lg btn-secondary !min-h-0 !py-3 !px-5">
        {label}
      </button>
    );
  }
  return (
    <div className="tile space-y-3 p-5" role="group" aria-label={`${label}?`}>
      <p className="text-xl font-semibold">{label} for good? This can&rsquo;t be undone.</p>
      {error && (
        <p role="alert" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const formData = new FormData();
            formData.set("questionId", questionId);
            run(submitFamilyDelete, formData);
          }}
          className="btn-lg btn-primary"
        >
          {pending ? "Deleting…" : "Yes, delete it"}
        </button>
        <button type="button" onClick={() => setAsking(false)} disabled={pending} className="btn-lg btn-secondary">
          Keep it
        </button>
      </div>
    </div>
  );
}
