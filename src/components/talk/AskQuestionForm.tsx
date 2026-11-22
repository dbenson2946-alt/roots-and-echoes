"use client";

import { useState } from "react";
import { submitFamilyQuestion } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";
import { Icon } from "@/components/Icon";
import { useServerAction } from "./useServerAction";

export interface PickablePhoto {
  id: string;
  label: string;
  imageUrl: string;
}

/**
 * A helper types (or says) a question for the senior, and can attach one of
 * the senior's photos. The senior sees it under "Questions from family".
 */
export function AskQuestionForm({ seniorFirstName, photos }: { seniorFirstName: string; photos: PickablePhoto[] }) {
  const { pending, error, run } = useServerAction();
  const [photoId, setPhotoId] = useState("");

  return (
    <form
      action={(formData) => {
        formData.set("photoId", photoId);
        run(submitFamilyQuestion, formData);
      }}
      className="space-y-6"
    >
      <VoiceTextField
        id="family-question"
        name="body"
        label={`Your question for ${seniorFirstName}`}
        placeholder="For example: What do you remember about Grandpa's workshop?"
        rows={4}
        required
      />

      {photos.length > 0 && (
        <details className="tile tile-compact p-4">
          <summary className="cursor-pointer text-lg font-bold">
            {photoId ? "A photo is attached (tap to change)" : "Add a photo to the question (optional)"}
          </summary>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Choose a photo">
            {photos.map((p) => {
              const chosen = photoId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  aria-label={p.label}
                  onClick={() => setPhotoId(chosen ? "" : p.id)}
                  className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border-4 bg-[var(--color-photo-tint)] ${
                    chosen ? "border-[var(--color-primary)]" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                  {chosen && (
                    <span className="absolute right-1 top-1 rounded-full bg-[var(--color-primary)] p-1 text-white">
                      <Icon name="check" className="h-5 w-5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {photoId && (
            <button type="button" onClick={() => setPhotoId("")} className="mt-3 text-lg font-semibold underline decoration-2 underline-offset-4">
              Take the photo off
            </button>
          )}
        </details>
      )}

      {error && (
        <p role="alert" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-lg btn-primary">
        <Icon name="arrowRight" className="h-5 w-5" /> {pending ? "Sending…" : `Send to ${seniorFirstName}`}
      </button>
    </form>
  );
}
