"use client";

import { useState, useTransition } from "react";
import { confirmAccountDelete, startAccountDeleteCode } from "@/app/actions";
import { errorText } from "@/lib/errorText";

/** Delete my account: type DELETE, get a code by email, enter it. */
export function DeleteAccountForm({ isOwner }: { isOwner: boolean }) {
  const [step, setStep] = useState<"type" | "code">("type");
  const [typed, setTyped] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sendCode() {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("typed", typed);
        const result = await startAccountDeleteCode(formData);
        if (result.status === "error") setError(result.message);
        else setStep("code");
      } catch (err) {
        setError(errorText(err, "That didn't work. Please try again."));
      }
    });
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("typed", typed);
        formData.set("token", token);
        const result = await confirmAccountDelete(formData);
        // On success the action redirects and never returns.
        if (result?.status === "error") setError(result.message);
      } catch (err) {
        // A redirect is not an error; only report real failures.
        const message = err instanceof Error ? err.message : "";
        if (/NEXT_REDIRECT/.test(message)) return;
        setError(errorText(err, "That didn't work. Please try again."));
      }
    });
  }

  return (
    <div className="space-y-4">
      {step === "type" ? (
        <>
          <label className="block space-y-2">
            <span className="text-lg font-bold">Type the word DELETE to go on</span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
            />
          </label>
          <button
            type="button"
            onClick={sendCode}
            disabled={pending || typed.trim().toUpperCase() !== "DELETE"}
            className="btn-lg btn-secondary"
          >
            {pending ? "Sending…" : "Email me a code"}
          </button>
        </>
      ) : (
        <>
          <p className="text-lg">
            We emailed a code to your address. Type it here. (The email also has a link; you don&rsquo;t need to use
            it.)
          </p>
          <label className="block space-y-2">
            <span className="text-lg font-bold">Code from the email</span>
            <input
              type="text"
              inputMode="numeric"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="one-time-code"
              className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={confirm} disabled={pending || !token.trim()} className="btn-lg btn-danger">
              {pending ? "Deleting…" : isOwner ? "Delete my account and everything in it" : "Delete my sign-in"}
            </button>
            <button type="button" onClick={() => { setStep("type"); setToken(""); setError(null); }} disabled={pending} className="btn-lg btn-secondary">
              Go back
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="status" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
