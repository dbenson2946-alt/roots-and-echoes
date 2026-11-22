"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { startConversation } from "@/app/actions";
import { Medallion } from "@/components/Medallion";
import { Icon, type IconName } from "@/components/Icon";
import { MOODS, MOOD_LABELS, type Mood } from "@/lib/conversation";

export interface PersonaCard {
  id: string;
  name: string;
  tagline: string;
  icon: IconName;
}

function CardButton({ persona }: { persona: PersonaCard }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="persona"
      value={persona.id}
      disabled={pending}
      className="tile tile-accent-talk mode-tile text-left disabled:opacity-60"
    >
      <Medallion icon={persona.icon} />
      <span className="text-2xl font-bold">{persona.name}</span>
      <span className="text-lg text-[var(--color-text-muted)]">{persona.tagline}</span>
    </button>
  );
}

function SurpriseButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="persona" value="surprise" disabled={pending} className="btn-lg btn-secondary">
      <Icon name="sparkle" className="h-5 w-5" /> {pending ? "Starting…" : "Surprise me"}
    </button>
  );
}

/** "Who would you like to talk with today?" — a mood, then a guide (or
 * "Surprise me"). Starting writes the guide's first question and opens it. */
export function TalkStarter({ personas }: { personas: PersonaCard[] }) {
  const [mood, setMood] = useState<Mood>("chat");

  return (
    <form action={startConversation} className="space-y-8">
      <input type="hidden" name="mood" value={mood} />

      <fieldset>
        <legend className="mb-3 text-2xl font-bold">What are you in the mood for?</legend>
        <div className="flex flex-wrap gap-3">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mood === m}
              onClick={() => setMood(m)}
              className={`btn-lg !min-h-0 !py-3 !px-5 flex-col !gap-0 ${mood === m ? "btn-primary" : "btn-secondary"}`}
            >
              <span>{MOOD_LABELS[m].label}</span>
              <span className="text-sm font-normal opacity-90">{MOOD_LABELS[m].blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <h2 className="mb-3 text-2xl font-bold">Who would you like to talk with today?</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {personas.map((p) => (
            <CardButton key={p.id} persona={p} />
          ))}
        </div>
      </div>

      <SurpriseButton />
    </form>
  );
}
