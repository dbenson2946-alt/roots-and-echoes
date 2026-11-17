"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitNewMilestone, submitEditMilestone } from "@/app/actions";
import { uploadImageDirect } from "@/lib/clientImageUpload";
import { VoiceTextField } from "@/components/VoiceTextField";
import { Icon } from "@/components/Icon";
import {
  MILESTONE_KIND_META,
  MILESTONE_KINDS,
  MONTH_NAMES,
  MIN_MILESTONE_YEAR,
  parseMilestoneDate,
} from "@/lib/lifeStoryBook";
import type { MilestoneKind } from "@/lib/types";

type PhotoChoice = "none" | "keep" | "upload" | "existing";

export interface MilestoneFormPhoto {
  id: string;
  label: string;
  imageUrl: string;
}

const FIELD = "w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xl";

/**
 * The one form behind both "Add a milestone" and "Edit this milestone".
 *
 * Submitted by hand (onSubmit + preventDefault) rather than through the
 * form's `action` prop the way the app's shorter forms are: React clears a
 * form's fields once its action finishes, which here would throw away
 * everything typed whenever a date needed correcting.
 *
 * A new picture is uploaded straight from the browser to Storage first
 * (uploadImageDirect, same as every other image upload in the app — see
 * storage.ts for why), and only its path is sent with the rest of the form.
 */
export function MilestoneForm({
  mode,
  milestoneId,
  initial,
  currentPhoto,
  photos,
}: {
  mode: "new" | "edit";
  milestoneId?: string;
  initial: {
    kind: MilestoneKind;
    title: string;
    description: string;
    year: string;
    month: string;
    day: string;
  };
  /** the photo already on this milestone, when editing — its picture may
   * be missing if the link to it couldn't be prepared just now, in which
   * case it's still kept unless the person chooses otherwise */
  currentPhoto?: { id: string; label: string; imageUrl?: string };
  /** photos already in the app that have a picture, to choose from */
  photos: MilestoneFormPhoto[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<MilestoneKind>(initial.kind);
  const [title, setTitle] = useState(initial.title);
  const [photoChoice, setPhotoChoice] = useState<PhotoChoice>(currentPhoto ? "keep" : "none");
  const [status, setStatus] = useState<string | null>(null);

  const cancelHref = mode === "edit" && milestoneId ? `/life-story-book/${milestoneId}` : "/life-story-book";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setStatus(null);

    // Check the date here first, so a picture is never uploaded for a
    // milestone that then can't be saved.
    const date = parseMilestoneDate(
      {
        year: String(formData.get("year") || ""),
        month: String(formData.get("month") || ""),
        day: String(formData.get("day") || ""),
      },
      new Date().getFullYear()
    );
    if (!date.ok) {
      setError(date.message);
      return;
    }

    const file = formData.get("photoFile");
    formData.delete("photoFile");
    formData.set("photoChoice", photoChoice);
    formData.set("kind", kind);
    if (photoChoice === "upload" && !(file instanceof File && file.size > 0)) {
      setError("Please choose a picture to upload, or pick a different photo option.");
      return;
    }
    if (photoChoice === "existing" && !formData.get("existingPhotoId")) {
      setError("Please tap one of the photos shown, or pick a different photo option.");
      return;
    }

    startTransition(async () => {
      try {
        if (photoChoice === "upload" && file instanceof File) {
          setStatus("Uploading the picture…");
          formData.set("storagePath", await uploadImageDirect(file));
        }
        setStatus("Saving…");
        if (mode === "edit" && milestoneId) formData.set("milestoneId", milestoneId);
        const result = mode === "edit" ? await submitEditMilestone(formData) : await submitNewMilestone(formData);
        if (result.status === "error") {
          setStatus(null);
          setError(result.message);
          return;
        }
        router.push(mode === "edit" ? `/life-story-book/${result.id}` : `/life-story-book#m-${result.id}`);
      } catch (err) {
        setStatus(null);
        setError(err instanceof Error ? err.message : "Something went wrong saving this milestone. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="milestone-kind" className="mb-2 block text-xl font-bold">
          What kind of milestone is it?
        </label>
        <select
          id="milestone-kind"
          value={kind}
          onChange={(e) => {
            const nextKind = e.target.value as MilestoneKind;
            // Carry the suggested title along with the kind, but only while
            // the title is still the untouched suggestion (or blank) — never
            // overwrite something the person has typed.
            if (mode === "new" && (title.trim() === "" || title === MILESTONE_KIND_META[kind].starterTitle)) {
              setTitle(MILESTONE_KIND_META[nextKind].starterTitle);
            }
            setKind(nextKind);
          }}
          className={FIELD}
        >
          {MILESTONE_KINDS.map((k) => (
            <option key={k} value={k}>
              {MILESTONE_KIND_META[k].label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="milestone-title" className="mb-2 block text-xl font-bold">
          A short title
        </label>
        <input
          id="milestone-title"
          name="title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`e.g. ${MILESTONE_KIND_META[kind].titleExample}`}
          className={FIELD}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-xl font-bold">When was it?</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="milestone-year" className="mb-1 block text-lg">
              Year
            </label>
            <input
              id="milestone-year"
              name="year"
              required
              inputMode="numeric"
              pattern="[0-9]{4}"
              title="Four digits, like 1958"
              maxLength={4}
              defaultValue={initial.year}
              placeholder="e.g. 1958"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="milestone-month" className="mb-1 block text-lg">
              Month <span className="text-[var(--color-text-muted)]">(if known)</span>
            </label>
            <select id="milestone-month" name="month" defaultValue={initial.month} className={FIELD}>
              <option value="">Not sure</option>
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="milestone-day" className="mb-1 block text-lg">
              Day <span className="text-[var(--color-text-muted)]">(if known)</span>
            </label>
            <input
              id="milestone-day"
              name="day"
              inputMode="numeric"
              pattern="[0-9]{1,2}"
              maxLength={2}
              defaultValue={initial.day}
              placeholder="e.g. 12"
              className={FIELD}
            />
          </div>
        </div>
        <p className="mt-2 text-base text-[var(--color-text-muted)]">
          Only the year is needed — a best guess is fine, and it can be changed later. Years from{" "}
          {MIN_MILESTONE_YEAR} onward.
        </p>
      </fieldset>

      <VoiceTextField
        id="milestone-description"
        name="description"
        label="A few words about it"
        placeholder="Where it was, who was there, what it meant…"
        defaultValue={initial.description}
        rows={4}
      />

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xl font-bold">A photo (optional)</legend>

        {currentPhoto && (
          <PhotoOption
            value="keep"
            current={photoChoice}
            onChange={setPhotoChoice}
            label="Keep the photo it has now"
          >
            {currentPhoto.imageUrl ? (
              <span className="mt-3 flex h-28 w-36 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-life-tint)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset Next's optimizer can cache */}
                <img src={currentPhoto.imageUrl} alt={currentPhoto.label} className="h-full w-full object-contain" />
              </span>
            ) : (
              <span className="mt-2 block text-lg text-[var(--color-text-muted)]">{currentPhoto.label}</span>
            )}
          </PhotoOption>
        )}

        <PhotoOption value="none" current={photoChoice} onChange={setPhotoChoice} label="No photo" />

        <PhotoOption value="upload" current={photoChoice} onChange={setPhotoChoice} label="Upload a new picture">
          {photoChoice === "upload" && (
            <span className="mt-3 block">
              <input
                name="photoFile"
                type="file"
                accept="image/*"
                aria-label="Choose a picture to upload"
                className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
              />
              <span className="mt-1 block text-base text-[var(--color-text-muted)]">
                It will also be saved in Photos &amp; Family, so it can be tagged and used again.
              </span>
            </span>
          )}
        </PhotoOption>

        {photos.length > 0 && (
          <PhotoOption
            value="existing"
            current={photoChoice}
            onChange={setPhotoChoice}
            label="Choose from photos already in the app"
          >
            {photoChoice === "existing" && (
              <span className="mt-3 grid max-h-96 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                {photos.map((photo) => (
                  <label
                    key={photo.id}
                    className="block cursor-pointer rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-2 has-[:checked]:border-[var(--color-life)] has-[:checked]:bg-[var(--color-life-tint)] has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-[var(--color-focus)]"
                  >
                    <input
                      type="radio"
                      name="existingPhotoId"
                      value={photo.id}
                      defaultChecked={currentPhoto?.id === photo.id}
                      className="sr-only"
                    />
                    <span className="flex h-28 items-center justify-center overflow-hidden rounded bg-[var(--color-photo-tint)]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset Next's optimizer can cache */}
                      <img src={photo.imageUrl} alt="" className="h-full w-full object-contain" />
                    </span>
                    <span className="mt-1 block truncate text-base">{photo.label}</span>
                  </label>
                ))}
              </span>
            )}
          </PhotoOption>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-xl border-2 border-[var(--color-danger)] p-3 text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-lg btn-primary">
          <Icon name="check" className="h-5 w-5" />
          {pending ? status || "Saving…" : mode === "edit" ? "Save changes" : "Add to the Life Story Book"}
        </button>
        <Link href={cancelHref} className="btn-lg btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

/** One large, tappable radio row in the photo picker; anything passed as
 * children (a file field, a grid of photos) appears inside the row. */
function PhotoOption({
  value,
  current,
  onChange,
  label,
  children,
}: {
  value: PhotoChoice;
  current: PhotoChoice;
  onChange: (value: PhotoChoice) => void;
  label: string;
  children?: ReactNode;
}) {
  const selected = current === value;
  return (
    <div
      className={`rounded-2xl border-2 p-4 ${
        selected ? "border-[var(--color-life)] bg-[var(--color-surface)]" : "border-[var(--color-border)]"
      }`}
    >
      <label className="flex min-h-[2.5rem] cursor-pointer items-center gap-3 text-xl">
        <input
          type="radio"
          name="photoChoiceRadio"
          value={value}
          checked={selected}
          onChange={() => onChange(value)}
          className="h-6 w-6 shrink-0 accent-[var(--color-life)]"
        />
        <span className={selected ? "font-bold" : ""}>{label}</span>
      </label>
      {children}
    </div>
  );
}
