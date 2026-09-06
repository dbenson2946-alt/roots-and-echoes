"use client";

import { useState, useTransition } from "react";
import { sendMagicLink } from "@/app/actions";

export function MagicLinkForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "sent" | "error"; text: string } | null>(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await sendMagicLink(formData);
          if (result.status === "sent") {
            setMessage({ kind: "sent", text: "Check your email — we've sent you a link to sign in." });
          } else {
            setMessage({ kind: "error", text: result.message });
          }
        });
      }}
      className="w-full max-w-sm space-y-4"
    >
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
      {message && (
        <p
          role="status"
          className={`text-lg ${
            message.kind === "error" ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
