"use client";

import { useState, useTransition } from "react";
import type { EditResult } from "@/app/actions";

/**
 * Runs a server action that either redirects on success (so only an error ever
 * comes back) or returns { status: "ok" }. Keeps a pending flag and an error
 * message for the form.
 */
export function useServerAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (formData: FormData) => Promise<EditResult>, formData: FormData, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result && result.status === "error") setError(result.message);
        else onOk?.();
      } catch (err) {
        // A redirect is thrown internally and handled by Next; anything else is a real failure.
        if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return { pending, error, run };
}
