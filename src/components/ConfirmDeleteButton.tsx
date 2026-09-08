"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";

/**
 * A destructive action's two-step confirm, done entirely inline — no
 * native confirm()/modal dialog, matching the app's design principle of
 * no modal dialogs that trap the user (see AGENTS-facing plan §2.4). The
 * first tap turns the plain "Delete" button into "Are you sure? Yes,
 * delete / Cancel"; only the second tap actually calls `action`.
 */
export function ConfirmDeleteButton({
  action,
  fields,
  idleLabel = "Delete",
  confirmQuestion = "Are you sure?",
  pendingLabel = "Removing…",
  size = "base",
  onDone,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  idleLabel?: string;
  confirmQuestion?: string;
  pendingLabel?: string;
  size?: "base" | "sm";
  onDone?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pad = size === "sm" ? "!py-2 !px-3 text-sm" : "!py-2 !px-4 text-base";

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className={`btn-lg btn-secondary !min-h-0 ${pad}`}
      >
        <Icon name="trash" className="h-4 w-4" />
        {idleLabel}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-base font-semibold">{confirmQuestion}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              const formData = new FormData();
              Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
              await action(formData);
              setConfirming(false);
              onDone?.();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
              setConfirming(false);
            }
          });
        }}
        className={`btn-lg btn-danger !min-h-0 ${pad}`}
      >
        {pending ? pendingLabel : "Yes, delete"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className={`btn-lg btn-secondary !min-h-0 ${pad}`}
      >
        Cancel
      </button>
      {error && (
        <span role="status" className="block w-full text-base text-[var(--color-danger)]">
          {error}
        </span>
      )}
    </span>
  );
}
