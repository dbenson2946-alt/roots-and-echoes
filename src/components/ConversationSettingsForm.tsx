"use client";

import { useState, useTransition } from "react";
import { submitConversationSettings } from "@/app/actions";
import type { PersonaId } from "@/lib/conversation";

/** Settings → Let's Talk (account owner only): the feature on or off, and
 * which guides are turned on. */
export function ConversationSettingsForm({
  talkEnabled,
  personas,
}: {
  talkEnabled: boolean;
  personas: { id: PersonaId; name: string; tagline: string; enabled: boolean }[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            const result = await submitConversationSettings(formData);
            setMessage(result.status === "ok" ? { ok: true, text: "Saved." } : { ok: false, text: result.message });
          } catch {
            setMessage({ ok: false, text: "Something went wrong. Please try again." });
          }
        });
      }}
      className="space-y-4"
    >
      <label className="flex cursor-pointer items-center gap-3 text-lg font-semibold">
        <input
          type="checkbox"
          name="talkEnabled"
          value="1"
          defaultChecked={talkEnabled}
          className="h-6 w-6 accent-[var(--color-primary)]"
        />
        Show Let&rsquo;s Talk on Home
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-lg font-bold">Guides you&rsquo;d like to talk with</legend>
        {personas.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-start gap-3 text-lg">
            <input
              type="checkbox"
              name="persona"
              value={p.id}
              defaultChecked={p.enabled}
              className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-primary)]"
            />
            <span>
              <span className="font-bold">{p.name}</span>{" "}
              <span className="text-base text-[var(--color-text-muted)]">{p.tagline}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {message && (
        <p role="status" className={`text-lg ${message.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-lg btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
