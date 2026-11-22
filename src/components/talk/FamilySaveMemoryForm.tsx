"use client";

import { submitFamilySaveMemory } from "@/app/actions";
import { CATEGORY_META } from "@/lib/ui";
import type { MemoryCategory } from "@/lib/types";
import { useServerAction } from "./useServerAction";

/** After answering, the senior can keep the question and answer as a Story Time memory. */
export function FamilySaveMemoryForm({
  questionId,
  defaultTitle,
}: {
  questionId: string;
  defaultTitle: string;
}) {
  const { pending, error, run } = useServerAction();
  const field = "w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg";

  return (
    <form
      action={(formData) => {
        formData.set("questionId", questionId);
        run(submitFamilySaveMemory, formData);
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fq-title" className="mb-1 block text-lg font-bold">
            Short title
          </label>
          <input id="fq-title" name="title" defaultValue={defaultTitle} className={field} />
        </div>
        <div>
          <label htmlFor="fq-category" className="mb-1 block text-lg font-bold">
            Topic
          </label>
          <select id="fq-category" name="category" defaultValue="family" className={field}>
            {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((key) => (
              <option key={key} value={key}>
                {CATEGORY_META[key].label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-lg btn-primary">
        {pending ? "Saving…" : "Save as a memory"}
      </button>
    </form>
  );
}
