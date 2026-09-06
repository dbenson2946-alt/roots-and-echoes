"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "@/app/actions";
import type { Role } from "@/lib/types";

export function OnboardingForm() {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>("senior");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await completeOnboarding(formData);
          if (result?.status === "error") setError(result.message);
        });
      }}
      className="w-full max-w-md space-y-6"
    >
      <fieldset className="space-y-2">
        <legend className="text-lg font-bold">This account is for…</legend>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`tile tile-compact cursor-pointer text-center !min-h-0 ${
              role === "senior" ? "bg-[var(--color-primary-tint)]" : ""
            }`}
          >
            <input
              type="radio"
              name="role"
              value="senior"
              checked={role === "senior"}
              onChange={() => setRole("senior")}
              className="sr-only"
            />
            <span className="text-lg font-bold">Me — sharing my own story</span>
          </label>
          <label
            className={`tile tile-compact cursor-pointer text-center !min-h-0 ${
              role === "caregiver" ? "bg-[var(--color-primary-tint)]" : ""
            }`}
          >
            <input
              type="radio"
              name="role"
              value="caregiver"
              checked={role === "caregiver"}
              onChange={() => setRole("caregiver")}
              className="sr-only"
            />
            <span className="text-lg font-bold">A family member helping someone else</span>
          </label>
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className="text-lg font-bold">Your name</span>
        <input
          name="name"
          type="text"
          required
          placeholder="e.g. Eleanor Whitfield"
          className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
        />
      </label>

      {role === "caregiver" && (
        <label className="block space-y-1">
          <span className="text-lg font-bold">Your relationship (optional)</span>
          <input
            name="relationshipLabel"
            type="text"
            placeholder='e.g. "son", "granddaughter"'
            className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
          />
        </label>
      )}

      {role === "caregiver" && (
        <p className="text-base text-[var(--color-text-muted)]">
          After this, you&rsquo;ll be asked whose story you&rsquo;re helping with. If they&rsquo;ve
          already invited your email from their Settings page, that access will be waiting for you.
        </p>
      )}

      {error && <p className="text-lg text-[var(--color-danger)]">{error}</p>}

      <button type="submit" disabled={pending} className="btn-lg btn-primary w-full">
        {pending ? "Setting up…" : "Continue"}
      </button>
    </form>
  );
}
