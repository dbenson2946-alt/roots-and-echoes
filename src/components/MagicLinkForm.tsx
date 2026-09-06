"use client";

import { useState, useTransition } from "react";
import { sendMagicLink, verifyOtpCode } from "@/app/actions";

export function MagicLinkForm() {
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function requestLink(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await sendMagicLink(formData);
      if (result.status === "sent") {
        setEmail(String(formData.get("email") || "").trim().toLowerCase());
        setStep("sent");
      } else {
        setError(result.message);
      }
    });
  }

  function confirmCode(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await verifyOtpCode(formData);
      // A successful verification redirects server-side and never returns
      // here — reaching this line means it didn't work.
      if (result?.status === "error") {
        setError(result.message);
      }
    });
  }

  if (step === "sent") {
    return (
      <div className="w-full max-w-sm space-y-6">
        <p role="status" className="text-lg text-[var(--color-text-muted)]">
          We&rsquo;ve emailed a sign-in link to <strong>{email}</strong>. You can select the
          link, or enter the 6-digit code from that same email below.
        </p>

        <form action={confirmCode} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <label className="block space-y-1 text-left">
            <span className="text-lg font-bold">6-digit code</span>
            <input
              name="token"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder="123456"
              maxLength={6}
              className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center text-2xl tracking-[0.3em]"
            />
          </label>
          <button type="submit" disabled={pending} className="btn-lg btn-primary w-full">
            {pending ? "Checking…" : "Confirm code"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep("email");
          }}
          className="text-lg text-[var(--color-text-muted)] underline"
        >
          Use a different email
        </button>

        {error && (
          <p role="status" className="text-lg text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={requestLink} className="w-full max-w-sm space-y-4">
      <label className="block space-y-1 text-left">
        <span className="text-lg font-bold">Email address</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
        />
      </label>
      <button type="submit" disabled={pending} className="btn-lg btn-primary w-full">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      {error && (
        <p role="status" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </form>
  );
}
