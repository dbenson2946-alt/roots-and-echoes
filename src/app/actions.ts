"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import mammoth from "mammoth";
// Side-effect import, must run before pdf-parse is ever loaded — see the
// polyfill file itself and §23's plan.md writeup for why.
import "@/lib/pdfTextExtractionPolyfill";
import { PDFParse } from "pdf-parse";
import { createClient } from "@/lib/supabase/server";
import {
  setActiveSenior,
  getResolvedSession,
  setTextSize,
} from "@/lib/session";
import {
  addMemory,
  getMemory,
  addRecordingToMemory,
  addLifeStoryRecording,
  addClipToLifeStoryRecording,
  updateLifeStoryRecordingDetails,
  addPerson,
  getPerson,
  getPeople,
  getProfile,
  updatePerson,
  deletePerson,
  tagPersonInPhoto,
  removePhotoTag,
  setPhotoCaption,
  setPhotoSeniorTag,
  addPhoto,
  getPhoto,
  deletePhoto,
  setPhotoStoragePath,
  addSong,
  addSongsBatch,
  updateSongsArtistBatch,
  updateSongsYoutubeLinksBatch,
  getSongs,
  getSong,
  addRecordingToSong,
  setSongAudioPath,
  updateSongLyrics,
  updateSongDetails,
  addBook,
  addArtPiece,
  setArtPieceImagePath,
  addActivity,
  getGrant,
  createProfile,
  revokeGrant,
  inviteCaregiverByEmail,
  cancelPendingInvite,
  setVoicePreference,
  setCustomVoice,
  getMemories,
  getPhotos,
} from "@/lib/store";
import { createImageUploadTicket, createAudioUploadTicket, type UploadTicket } from "@/lib/storage";
import { SENIOR_PHOTO_TAG_VALUE, MAX_LYRICS_UPLOAD_BYTES, formatFileSize } from "@/lib/ui";
import type { MemoryCategory, RelationshipType, ArtMedium, VoicePreset, Role, CaregiverPermission } from "@/lib/types";
import type { LifeStoryExportData, ExportMemory } from "@/lib/lifeStoryExport";
import type { FamilyTreeExportData, ExportPerson } from "@/lib/familyTreeExport";
import type { PhotosExportData, ExportPhoto } from "@/lib/photosExport";

/** Every mutation re-derives the acting profile & permission from the
 * server-side session (Supabase Auth + the profiles table) rather than
 * trusting anything the client sends — the client can only say *what*
 * changed, never *who* it's for. */
async function requireContributor() {
  const session = await getResolvedSession();
  if (!session || !session.activeSeniorId) {
    throw new Error("Not signed in to a story.");
  }
  if (!session.isSelf) {
    const grant = await getGrant(session.profile.id, session.activeSeniorId);
    if (!grant || grant.permission !== "contribute") {
      throw new Error("This account only has view access.");
    }
  }
  return session;
}

// ---- Auth / session ----
// Real sign-in is Supabase Auth's magic-link email, handled directly here
// and finished in src/app/auth/callback/route.ts. There is no password and
// no "tap your name" demo list anymore.

export type SendMagicLinkResult = { status: "sent" } | { status: "error"; message: string };

export async function sendMagicLink(formData: FormData): Promise<SendMagicLinkResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Please enter a valid email address." };
  }
  const supabase = await createClient();
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (error) return { status: "error", message: error.message };
  return { status: "sent" };
}

/**
 * Verifies the one-time sign-in code that's included in the same email as
 * the sign-in link (its length is whatever this Supabase project's Email
 * OTP length setting is — don't assume 6 digits). Some email providers/
 * security scanners automatically "click" links in incoming mail to check
 * them for safety, which silently burns the link's one-time code before
 * the person ever sees it (a very common real-world failure — see
 * Supabase's own otp_expired troubleshooting guide). Typing the code
 * instead can't be triggered by an automated scanner, so it's the reliable
 * fallback to the link.
 */
export type VerifyOtpResult = { status: "error"; message: string } | undefined;

export async function verifyOtpCode(formData: FormData): Promise<VerifyOtpResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const token = String(formData.get("token") || "").replace(/\s/g, "");
  if (!email || !token) {
    return { status: "error", message: "Enter the sign-in code from your email." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return {
      status: "error",
      message: "That code didn't work — it may be wrong or expired. Request a new one below.",
    };
  }
  redirect("/");
}

/**
 * Finishes sign-in from the emailed link, but only when this action is
 * actually invoked (i.e. a person clicked the "Confirm sign-in" button on
 * /auth/confirm) — never on the mere GET request that loads that page. The
 * email templates link to /auth/confirm?token_hash=...&type=email rather
 * than Supabase's own hosted verification endpoint precisely so that an
 * automated email-security scanner fetching the link only ever sees an
 * inert page with a button, not a request that consumes the one-time
 * token. See Supabase's passwordless-email docs for this pattern.
 */
export async function confirmSignIn(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") || "").trim();
  const next = String(formData.get("next") || "").trim() || "/";
  if (!tokenHash) redirect("/login?error=auth");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error) redirect("/login?error=auth");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function chooseActiveSenior(seniorId: string) {
  await setActiveSenior(seniorId);
  redirect("/");
}

export async function changeTextSize(formData: FormData) {
  const size = String(formData.get("size") || "normal") as "normal" | "large" | "xl";
  await setTextSize(size);
  revalidatePath("/", "layout");
}

// ---- Onboarding (first sign-in after the magic link) ----

export type CompleteOnboardingResult = { status: "error"; message: string } | undefined;

export async function completeOnboarding(formData: FormData): Promise<CompleteOnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = String(formData.get("role") || "senior") as Role;
  const name = String(formData.get("name") || "").trim();
  const relationshipLabel = String(formData.get("relationshipLabel") || "").trim() || undefined;
  if (!name) return { status: "error", message: "Please enter your name." };

  await createProfile({ id: user.id, role, name, relationshipLabel: role === "caregiver" ? relationshipLabel : undefined });

  revalidatePath("/", "layout");
  if (role === "caregiver") redirect("/switch-account");
  redirect("/");
}

// ---- Story Time ----

// ---- Audio clips (memory recordings & song recordings) ----
// Recorded-live and uploaded-from-outside clips both go through here. Both
// now arrive as already-uploaded storage paths (set by the form component
// via uploadAudioDirect/clientAudioUpload.ts before this action is even
// called) rather than raw Files — this used to route the file's bytes
// through this Server Action via uploadAudioFile, bounded by Vercel's
// 4.5MB function body limit, until that proved too tight for a real
// recording; see src/lib/storage.ts's file-level comment. Either, both, or
// neither of a recorded clip and an uploaded file can be present in one
// submission — a memory/song can hold any number of clips, so providing
// both adds two, not one replacing the other.
function labelFromFileName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "").trim();
  return base || "Uploaded audio";
}

async function saveAudioClips(
  formData: FormData,
  labelOverride: string | undefined,
  addRecording: (label: string, audioPath: string) => Promise<void>
) {
  const recordedPath = String(formData.get("recordedAudioPath") || "").trim();
  if (recordedPath) {
    await addRecording(labelOverride || "Recorded voice", recordedPath);
  }
  const uploadedPath = String(formData.get("uploadedAudioPath") || "").trim();
  if (uploadedPath) {
    const uploadedName = String(formData.get("uploadedAudioFileName") || "").trim();
    await addRecording(labelOverride || labelFromFileName(uploadedName), uploadedPath);
  }
}

// ---- Lyrics upload (David's §22 request: an "upload a file" alternative
// to typing/pasting lyrics, for both a new song and an already-saved one).
// Unlike audio, nothing here is stored as a file — only the extracted
// plain text is ever kept (David's explicit choice), so there's no Storage
// bucket involved and no migration needed for this one.
function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || file.type === "text/plain") {
    return file.text();
  }
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return file
      .arrayBuffer()
      .then((buf) => mammoth.extractRawText({ buffer: Buffer.from(buf) }))
      .then((result) => result.value);
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return file.arrayBuffer().then(async (buf) => {
      const parser = new PDFParse({ data: buf });
      try {
        // Join pages ourselves, not via result.text — that string has a
        // "-- page_number of total_number --" marker spliced between
        // pages (pdf-parse's own default pageJoiner), which would
        // otherwise end up saved as literal junk text in someone's lyrics.
        const result = await parser.getText();
        return result.pages.map((p) => p.text).join("\n");
      } finally {
        await parser.destroy();
      }
    });
  }
  return Promise.reject(new Error("Please choose a .txt, .docx, or .pdf file."));
}

export type ExtractLyricsResult = { text: string } | { error: string };

export async function extractLyricsFromFile(formData: FormData): Promise<ExtractLyricsResult> {
  await requireContributor();
  const file = formData.get("lyricsFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file was selected." };
  }
  if (file.size > MAX_LYRICS_UPLOAD_BYTES) {
    return { error: `That file is ${formatFileSize(file.size)} — please choose one under ${formatFileSize(MAX_LYRICS_UPLOAD_BYTES)}.` };
  }
  try {
    const text = (await extractTextFromFile(file)).trim();
    if (!text) {
      return { error: "Couldn't find any readable text in that file — a scanned or image-only PDF won't work here." };
    }
    return { text };
  } catch {
    return { error: "Couldn't read that file. Please try a .txt, .docx, or .pdf file." };
  }
}

export async function submitMemory(formData: FormData) {
  const session = await requireContributor();
  const title = String(formData.get("title") || "").trim();
  const transcript = String(formData.get("transcript") || "").trim();
  const category = String(formData.get("category") || "other") as MemoryCategory;
  const memoryDate = String(formData.get("memoryDate") || "").trim() || undefined;
  const prompt = String(formData.get("prompt") || "").trim() || undefined;

  if (!title || !transcript) return;

  const memory = await addMemory({
    seniorId: session.activeSeniorId!,
    category,
    title,
    transcript,
    memoryDate,
    prompt,
    linkedPersonIds: [],
    linkedPhotoIds: [],
    linkedArtIds: [],
    enteredBy: {
      profileId: session.profile.id,
      name: session.profile.name,
      role: session.profile.role,
    },
  });
  await saveAudioClips(formData, undefined, (label, path) =>
    addRecordingToMemory(memory.id, label, path)
  );
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "memory_added",
    summary: `Added a memory: "${title}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });

  revalidatePath("/story-time");
}

/** Adds another recording to a memory that already exists — see
 * AddMemoryRecordingForm.tsx, used on the memory detail page. */
export async function submitRecordingToMemory(formData: FormData) {
  const session = await requireContributor();
  const memoryId = String(formData.get("memoryId") || "");
  const label = String(formData.get("label") || "").trim() || undefined;
  if (!memoryId) return;

  await saveAudioClips(formData, label, (lbl, path) =>
    addRecordingToMemory(memoryId, lbl, path)
  );
  const memory = await getMemory(memoryId);
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "recording_added",
    summary: `Added a recording to "${memory?.title || "a memory"}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });
  revalidatePath(`/story-time/${memoryId}`);
}

// ---- Life Story Recordings (a second, separate capability on Story
// Time — see store.ts's own section header and types.ts's doc comment
// on LifeStoryRecording for why this is its own thing rather than a
// variant of submitMemory above) ----

export async function submitLifeStoryRecording(formData: FormData) {
  const session = await requireContributor();
  const title = String(formData.get("title") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  if (!title || !summary) return;

  const recording = await addLifeStoryRecording({
    seniorId: session.activeSeniorId!,
    title,
    summary,
    enteredBy: {
      profileId: session.profile.id,
      name: session.profile.name,
      role: session.profile.role,
    },
  });
  await saveAudioClips(formData, undefined, (label, path) =>
    addClipToLifeStoryRecording(recording.id, label, path)
  );
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "life_story_recording_added",
    summary: `Added a life story recording: "${title}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });

  revalidatePath("/story-time");
}

/** Adds another audio clip to a recording that already exists — e.g. a
 * long conversation saved as "Part 1" now, "Part 2" later. See
 * AddLifeStoryRecordingClipForm.tsx, used on the recording's detail
 * page. Matches AddMemoryRecordingForm's own shape above. */
export async function submitAddLifeStoryRecordingClip(formData: FormData) {
  await requireContributor();
  const recordingId = String(formData.get("recordingId") || "");
  const label = String(formData.get("label") || "").trim() || undefined;
  if (!recordingId) return;

  await saveAudioClips(formData, label, (lbl, path) =>
    addClipToLifeStoryRecording(recordingId, lbl, path)
  );
  // Matches §16/§22/§25's precedent: adding to something that already
  // exists doesn't log a fresh Activity Tracker entry — only the first,
  // brand-new addition did, above.
  revalidatePath(`/story-time/life-story/${recordingId}`);
}

/** Edits an already-saved recording's title/summary. Matches §25's
 * EditSongDetailsForm precedent: no Activity Tracker entry for an edit,
 * only for the original addition. */
export async function submitEditLifeStoryRecording(formData: FormData) {
  await requireContributor();
  const id = String(formData.get("recordingId") || "");
  const title = String(formData.get("title") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  if (!id || !title || !summary) return;

  await updateLifeStoryRecordingDetails(id, { title, summary });
  revalidatePath(`/story-time/life-story/${id}`);
  revalidatePath("/story-time");
}

// ---- Image uploads (photos & art) ----
// The file's bytes never touch a Server Action / Vercel function body — see
// the comment at the top of src/lib/storage.ts. A form component calls this
// first to get a one-time signed slot, uploads the file straight to Supabase
// Storage from the browser, then submits only the resulting storage path.

export type RequestImageUploadTicketResult = { status: "ok"; ticket: UploadTicket } | { status: "error"; message: string };

export async function requestImageUploadTicket(fileName: string): Promise<RequestImageUploadTicketResult> {
  const session = await requireContributor();
  try {
    const ticket = await createImageUploadTicket(session.activeSeniorId!, fileName);
    return { status: "ok", ticket };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to prepare upload." };
  }
}

// ---- Audio uploads (song audio, memory/song recordings, voice sample) ----
// Same ticket pattern as image uploads above — see this file's own note and
// the one at the top of src/lib/storage.ts. Replaces the old uploadAudioFile
// Server-Action path, which was bounded by Vercel's 4.5MB function body
// limit; see MAX_AUDIO_UPLOAD_BYTES in src/lib/ui.ts for the new ceiling.

export type RequestAudioUploadTicketResult = { status: "ok"; ticket: UploadTicket } | { status: "error"; message: string };

export async function requestAudioUploadTicket(fileName: string): Promise<RequestAudioUploadTicketResult> {
  const session = await requireContributor();
  try {
    const ticket = await createAudioUploadTicket(session.activeSeniorId!, fileName);
    return { status: "ok", ticket };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to prepare upload." };
  }
}

// ---- Photos & Family ----

export async function submitNewPerson(formData: FormData) {
  const session = await requireContributor();
  const name = String(formData.get("name") || "").trim();
  const relationshipToSenior = String(formData.get("relationship") || "other") as RelationshipType;
  const relationshipLabel = String(formData.get("relationshipLabel") || "").trim() || undefined;
  const spouseId = String(formData.get("spouseId") || "").trim() || undefined;
  const parentIds = [String(formData.get("parentId1") || "").trim(), String(formData.get("parentId2") || "").trim()].filter(
    (id): id is string => Boolean(id)
  );
  if (!name) return;

  const palette = ["var(--color-story-tint)", "var(--color-photo-tint)", "var(--color-music-tint)", "var(--color-primary-tint)"];

  await addPerson({
    seniorId: session.activeSeniorId!,
    name,
    relationshipToSenior,
    relationshipLabel,
    photoInitials: name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    photoColor: palette[Math.floor(Math.random() * palette.length)],
    livingStatus: "living",
    spouseId,
    parentIds,
  });
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "person_added",
    summary: `Added ${name} to the family tree`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });

  revalidatePath("/photos");
  revalidatePath("/photos/family-tree");
}

export async function submitEditPerson(formData: FormData) {
  await requireContributor();
  const personId = String(formData.get("personId") || "");
  const name = String(formData.get("name") || "").trim();
  const relationshipToSenior = String(formData.get("relationship") || "other") as RelationshipType;
  const relationshipLabel = String(formData.get("relationshipLabel") || "").trim() || undefined;
  const livingStatus = String(formData.get("livingStatus") || "living") as "living" | "deceased" | "unknown";
  const rawSpouseId = String(formData.get("spouseId") || "").trim() || null;
  const spouseId = rawSpouseId && rawSpouseId !== personId ? rawSpouseId : null;
  const parentIds = [String(formData.get("parentId1") || "").trim(), String(formData.get("parentId2") || "").trim()].filter(
    (id): id is string => Boolean(id) && id !== personId
  );
  if (!personId || !name) return;
  await updatePerson(personId, { name, relationshipToSenior, relationshipLabel, livingStatus, spouseId, parentIds });
  revalidatePath("/photos");
  revalidatePath("/photos/family-tree");
}

/** No confirmation dialog here — the two-step "Are you sure?" confirm
 * lives in the client component (PersonRow.tsx) before this is ever
 * called. Doesn't write to the Activity Tracker, matching how "Remove
 * access" / "Cancel invite" already behave elsewhere in the app. */
export async function submitDeletePerson(formData: FormData) {
  await requireContributor();
  const personId = String(formData.get("personId") || "");
  if (!personId) return;
  await deletePerson(personId);
  revalidatePath("/photos");
  revalidatePath("/photos/family-tree");
}

export async function submitPhotoTag(formData: FormData) {
  const session = await requireContributor();
  const photoId = String(formData.get("photoId") || "");
  const personId = String(formData.get("personId") || "");
  if (!photoId || !personId) return;

  // The one extra option in the tag picker — the senior themselves — isn't
  // a real people-table id, so it's handled separately (see
  // SENIOR_PHOTO_TAG_VALUE's doc comment).
  if (personId === SENIOR_PHOTO_TAG_VALUE) {
    await setPhotoSeniorTag(photoId, true);
    const [senior, photo] = await Promise.all([getProfile(session.activeSeniorId!), getPhoto(photoId)]);
    await addActivity({
      seniorId: session.activeSeniorId!,
      type: "photo_tagged",
      summary: `Tagged ${senior?.name || "the senior"} in "${photo?.label || "a photo"}"`,
      actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
    });
    revalidatePath("/photos");
    return;
  }

  await tagPersonInPhoto(photoId, personId);
  const [person, photo] = await Promise.all([getPerson(personId), getPhoto(photoId)]);
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "photo_tagged",
    summary: `Tagged ${person?.name || "someone"} in "${photo?.label || "a photo"}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });
  revalidatePath("/photos");
}

export async function submitRemovePhotoTag(formData: FormData) {
  await requireContributor();
  const photoId = String(formData.get("photoId") || "");
  const personId = String(formData.get("personId") || "");
  if (!photoId || !personId) return;
  await removePhotoTag(photoId, personId);
  revalidatePath("/photos");
}

export async function submitRemoveSeniorPhotoTag(formData: FormData) {
  await requireContributor();
  const photoId = String(formData.get("photoId") || "");
  if (!photoId) return;
  await setPhotoSeniorTag(photoId, false);
  revalidatePath("/photos");
}

export async function submitNewPhoto(formData: FormData) {
  const session = await requireContributor();
  const label = String(formData.get("label") || "").trim();
  const caption = String(formData.get("caption") || "").trim() || undefined;
  const dateTaken = String(formData.get("dateTaken") || "").trim() || undefined;
  if (!label) return;

  const swatches = ["var(--color-story-tint)", "var(--color-photo-tint)", "var(--color-music-tint)", "var(--color-primary-tint)"];

  const storagePath = String(formData.get("storagePath") || "").trim() || undefined;

  await addPhoto({
    seniorId: session.activeSeniorId!,
    label,
    caption,
    dateTaken,
    taggedPersonIds: [],
    colorSwatch: swatches[Math.floor(Math.random() * swatches.length)],
    storagePath,
  });
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "photo_added",
    summary: `Added a photo: "${label}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });

  revalidatePath("/photos");
}

export async function submitPhotoCaption(formData: FormData) {
  const session = await requireContributor();
  const photoId = String(formData.get("photoId") || "");
  const caption = String(formData.get("caption") || "").trim();
  if (!photoId || !caption) return;
  await setPhotoCaption(photoId, caption);
  const photo = await getPhoto(photoId);
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "photo_caption_added",
    summary: `Added a caption to "${photo?.label || "a photo"}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });
  revalidatePath("/photos");
}

export async function submitPhotoImage(formData: FormData) {
  const session = await requireContributor();
  const photoId = String(formData.get("photoId") || "");
  const storagePath = String(formData.get("storagePath") || "").trim();
  if (!photoId || !storagePath) return;
  await setPhotoStoragePath(photoId, storagePath);
  const photo = await getPhoto(photoId);
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "photo_added",
    summary: `Added an image for "${photo?.label || "a photo"}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });
  revalidatePath("/photos");
}

/** No confirmation dialog here — see submitDeletePerson's note above; same
 * pattern. Removes the photo's tags and memory links along with it (both
 * cascade at the database level), and deletes the actual image file from
 * Storage too, not just the database row. */
export async function submitDeletePhoto(formData: FormData) {
  await requireContributor();
  const photoId = String(formData.get("photoId") || "");
  if (!photoId) return;
  await deletePhoto(photoId);
  revalidatePath("/photos");
}

// ---- Music ----

export async function submitNewSong(formData: FormData) {
  const session = await requireContributor();
  const title = String(formData.get("title") || "").trim();
  const artist = String(formData.get("artist") || "").trim() || undefined;
  const lyrics = String(formData.get("lyrics") || "").trim();
  const personalNote = String(formData.get("personalNote") || "").trim() || undefined;
  if (!title) return;

  const audioPath = String(formData.get("audioPath") || "").trim() || undefined;

  await addSong({
    seniorId: session.activeSeniorId!,
    title,
    artist,
    lyrics,
    personalNote,
    audioPath,
  });
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "song_added",
    summary: `Added a song: "${title}"${artist ? ` by ${artist}` : ""}`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });

  revalidatePath("/music");
}

/** One-time bulk import of David's existing lyrics library (title + lyrics
 * only, no artist/audio) — reached only via its own direct-URL page
 * (src/app/music/import/page.tsx), never linked from navigation, since
 * David asked for a one-time import rather than a permanent feature. Takes
 * plain already-extracted {title, lyrics} pairs (the browser reads each
 * selected file itself) rather than FormData/File — nothing here needs a
 * file upload, since the files' text is all that's ever kept, same as the
 * existing single-file lyrics-upload path (§22). */
export async function submitBulkImportLyrics(
  items: { title: string; lyrics: string }[]
): Promise<{ imported: number; skipped: string[] }> {
  const session = await requireContributor();
  if (!Array.isArray(items) || items.length === 0) return { imported: 0, skipped: [] };
  const result = await addSongsBatch(session.activeSeniorId!, items);
  revalidatePath("/music");
  return result;
}

/** Sibling of submitBulkImportLyrics — a second one-time pass (David's
 * files now carry an artist line too) that only sets artist on songs
 * already imported, matched by title; never creates a song. Reached via
 * src/app/music/import-artists/page.tsx, same direct-URL-only, not
 * nav-linked pattern. */
export async function submitBulkUpdateArtists(
  items: { title: string; artist: string }[]
): Promise<{ updated: string[]; unmatched: string[] }> {
  const session = await requireContributor();
  if (!Array.isArray(items) || items.length === 0) return { updated: [], unmatched: [] };
  const result = await updateSongsArtistBatch(session.activeSeniorId!, items);
  revalidatePath("/music");
  return result;
}

/** Third sibling of submitBulkImportLyrics/submitBulkUpdateArtists — a
 * one-time pass (David's files now carry a YouTube link as their 3rd
 * line) that only sets youtube_url on songs already imported, matched by
 * title; never creates a song. Reached via
 * src/app/music/import-youtube/page.tsx, same direct-URL-only pattern. */
export async function submitBulkUpdateYoutubeLinks(
  items: { title: string; youtubeUrl: string }[]
): Promise<{ updated: string[]; unmatched: string[] }> {
  const session = await requireContributor();
  if (!Array.isArray(items) || items.length === 0) return { updated: [], unmatched: [] };
  const result = await updateSongsYoutubeLinksBatch(session.activeSeniorId!, items);
  revalidatePath("/music");
  return result;
}

export async function submitSongAudio(formData: FormData) {
  const session = await requireContributor();
  const songId = String(formData.get("songId") || "");
  const audioPath = String(formData.get("audioPath") || "").trim();
  if (!songId || !audioPath) return;
  await setSongAudioPath(songId, audioPath);
  const song = await getSong(songId);
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "song_audio_added",
    summary: `Added audio for "${song?.title || "a song"}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });
  revalidatePath(`/music/${songId}`);
  revalidatePath("/music");
}

/** Adding/replacing lyrics on an already-saved song — editing lyrics
 * doesn't log to the Activity Tracker, same as every other edit in the app
 * (submitEditPerson, §16) — the log has always only ever meant "what's
 * been added," not "what's been corrected." */
export async function submitEditSongLyrics(formData: FormData) {
  await requireContributor();
  const songId = String(formData.get("songId") || "");
  const lyrics = String(formData.get("lyrics") || "");
  if (!songId) return;
  await updateSongLyrics(songId, lyrics);
  revalidatePath(`/music/${songId}`);
}

/** Edits title/artist/personal note on an already-saved song — the same gap
 * submitEditSongLyrics closed for lyrics (§22), now closed for the rest of
 * a song's fields too. Same no-Activity-Tracker-log precedent as every
 * other edit in the app (submitEditPerson §16, submitEditSongLyrics §22). */
export async function submitEditSongDetails(formData: FormData) {
  await requireContributor();
  const songId = String(formData.get("songId") || "");
  const title = String(formData.get("title") || "").trim();
  const artist = String(formData.get("artist") || "").trim() || undefined;
  const personalNote = String(formData.get("personalNote") || "").trim() || undefined;
  const youtubeUrl = String(formData.get("youtubeUrl") || "").trim() || undefined;
  if (!songId || !title) return;
  await updateSongDetails(songId, { title, artist, personalNote, youtubeUrl });
  revalidatePath(`/music/${songId}`);
  revalidatePath("/music");
}

export async function submitRecording(formData: FormData) {
  const session = await requireContributor();
  const songId = String(formData.get("songId") || "");
  const label = String(formData.get("label") || "").trim() || undefined;
  if (!songId) return;
  await saveAudioClips(formData, label, (lbl, path) =>
    addRecordingToSong(songId, lbl, path)
  );
  const song = await getSong(songId);
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "recording_added",
    summary: `Recorded singing "${song?.title || "a song"}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });
  revalidatePath(`/music/${songId}`);
}

// ---- "Ask for a song" (search by title/artist, then play it) ----

function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

/** Simple, forgiving title/artist matcher — good enough for a personal
 * library of a few dozen songs. Exact/substring matches score highest,
 * with a word-overlap fallback for a spoken query that's a bit off. */
function scoreSongMatch(query: string, title: string, artist?: string): number {
  const q = normalizeForSearch(query);
  if (!q) return 0;
  const t = normalizeForSearch(title);
  const a = normalizeForSearch(artist || "");
  let score = 0;
  if (t === q) score = Math.max(score, 100);
  if (t && (t.includes(q) || q.includes(t))) score = Math.max(score, 80);
  if (a && (a.includes(q) || q.includes(a))) score = Math.max(score, 60);
  const qWords = q.split(/\s+/).filter(Boolean);
  const targetWords = new Set(`${t} ${a}`.split(/\s+/).filter(Boolean));
  const overlap = qWords.filter((w) => targetWords.has(w)).length;
  if (qWords.length > 0) score = Math.max(score, (overlap / qWords.length) * 50);
  return score;
}

export type SongRequestResult =
  | { status: "playing"; song: { id: string; title: string; artist?: string; audioUrl: string } }
  | { status: "no-audio"; song: { id: string; title: string; artist?: string } }
  | { status: "not-found" };

export async function requestSong(query: string): Promise<SongRequestResult> {
  const session = await getResolvedSession();
  if (!session || !session.activeSeniorId) return { status: "not-found" };
  const songs = await getSongs(session.activeSeniorId);

  let best: (typeof songs)[number] | null = null;
  let bestScore = 0;
  for (const song of songs) {
    const s = scoreSongMatch(query, song.title, song.artist);
    if (s > bestScore) {
      bestScore = s;
      best = song;
    }
  }

  if (!best || bestScore < 30) return { status: "not-found" };
  if (!best.audioUrl) return { status: "no-audio", song: { id: best.id, title: best.title, artist: best.artist } };
  return {
    status: "playing",
    song: { id: best.id, title: best.title, artist: best.artist, audioUrl: best.audioUrl },
  };
}

// ---- Books ----

export async function submitNewBook(formData: FormData) {
  const session = await requireContributor();
  const title = String(formData.get("title") || "").trim();
  const author = String(formData.get("author") || "").trim() || undefined;
  const personalNote = String(formData.get("personalNote") || "").trim() || undefined;
  if (!title) return;

  await addBook({
    seniorId: session.activeSeniorId!,
    title,
    author,
    personalNote,
  });
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "book_added",
    summary: `Added a book: "${title}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });

  revalidatePath("/books");
}

// ---- Art ----

export async function submitNewArt(formData: FormData) {
  const session = await requireContributor();
  const title = String(formData.get("title") || "").trim();
  const artist = String(formData.get("artist") || "").trim() || undefined;
  const medium = String(formData.get("medium") || "other") as ArtMedium;
  const personalNote = String(formData.get("personalNote") || "").trim() || undefined;
  const prompt = String(formData.get("prompt") || "").trim() || undefined;
  if (!title) return;

  const swatches = ["var(--color-art-tint)", "var(--color-story-tint)", "var(--color-photo-tint)", "var(--color-primary-tint)"];

  const imagePath = String(formData.get("storagePath") || "").trim() || undefined;

  await addArtPiece({
    seniorId: session.activeSeniorId!,
    medium,
    title,
    artist,
    personalNote,
    prompt,
    colorSwatch: swatches[Math.floor(Math.random() * swatches.length)],
    label: title,
    imagePath,
  });
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "art_added",
    summary: `Added an art piece: "${title}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });

  revalidatePath("/art");
}

export async function submitArtImage(formData: FormData) {
  await requireContributor();
  const artId = String(formData.get("artId") || "");
  const imagePath = String(formData.get("storagePath") || "").trim();
  if (!artId || !imagePath) return;
  await setArtPieceImagePath(artId, imagePath);
  revalidatePath(`/art/${artId}`);
  revalidatePath("/art");
}

// ---- Caregiver management (senior only) ----

export async function inviteCaregiverAction(formData: FormData): Promise<void> {
  const session = await getResolvedSession();
  if (!session || !session.isSelf) throw new Error("Only the account owner can invite a caregiver.");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const permission = String(formData.get("permission") || "contribute") as CaregiverPermission;
  if (!email || !email.includes("@")) return;
  await inviteCaregiverByEmail(session.profile.id, session.profile.name, email, permission);
  revalidatePath("/settings");
}

export async function cancelInviteAction(formData: FormData) {
  const session = await getResolvedSession();
  if (!session || !session.isSelf) throw new Error("Only the account owner can cancel an invite.");
  const inviteId = String(formData.get("inviteId") || "");
  if (!inviteId) return;
  await cancelPendingInvite(inviteId);
  revalidatePath("/settings");
}

export async function revokeGrantAction(formData: FormData) {
  const session = await getResolvedSession();
  if (!session || !session.isSelf) throw new Error("Only the account owner can revoke access.");
  const grantId = String(formData.get("grantId") || "");
  if (!grantId) return;
  await revokeGrant(grantId);
  revalidatePath("/settings");
}

// ---- Read-aloud voice (account owner only) ----

/** Same ticket pattern as requestAudioUploadTicket, but deliberately
 * narrower: submitCustomVoice below only ever accepts changes from the
 * account owner (session.isSelf), not a contribute-permission caregiver,
 * so the ticket that lets someone upload into this path needs the same
 * restriction — otherwise a caregiver could mint a valid upload ticket and
 * put a file in Storage even though setCustomVoice itself would still
 * correctly refuse to apply it, which is a confusing half-success for them
 * (an upload that "succeeds" but never takes effect). */
export async function requestVoiceSampleUploadTicket(fileName: string): Promise<RequestAudioUploadTicketResult> {
  const session = await getResolvedSession();
  if (!session || !session.isSelf) {
    return { status: "error", message: "Only the account owner can change this." };
  }
  try {
    const ticket = await createAudioUploadTicket(session.profile.id, fileName);
    return { status: "ok", ticket };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to prepare upload." };
  }
}

export async function submitVoicePreference(formData: FormData) {
  const session = await getResolvedSession();
  if (!session || !session.isSelf) throw new Error("Only the account owner can change this.");
  const preset = String(formData.get("preset") || "default") as VoicePreset;
  await setVoicePreference(session.profile.id, preset);
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function submitCustomVoice(formData: FormData) {
  const session = await getResolvedSession();
  if (!session || !session.isSelf) throw new Error("Only the account owner can change this.");
  const label = String(formData.get("label") || "").trim() || "My custom voice";
  const consent = formData.get("consent") === "on";
  const sampleAudioPath = String(formData.get("audioPath") || "").trim();
  if (!consent || !sampleAudioPath) return;
  await setCustomVoice(session.profile.id, {
    sampleAudioPath,
    label,
    consentConfirmed: consent,
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

// ---- Life-story PDF export (§17 of the project plan) ----
// The PDF itself is built entirely client-side (never through a Server
// Action) specifically to stay clear of Vercel's hard 4.5MB function
// response limit — see §15/§17 in the plan doc. This action's only job is to
// hand the browser the plain data it needs (memories + their linked photos'
// already-resolved signed image URLs), gated by the same "contribute"
// permission every other write in the app requires.
export async function getLifeStoryExportData(): Promise<LifeStoryExportData> {
  const session = await requireContributor();
  const seniorId = session.activeSeniorId!;
  const [senior, memories, photos] = await Promise.all([
    getProfile(seniorId),
    getMemories(seniorId),
    getPhotos(seniorId),
  ]);
  const photosById = new Map(photos.map((p) => [p.id, p]));

  const exportMemories: ExportMemory[] = memories.map((m) => ({
    id: m.id,
    title: m.title,
    transcript: m.transcript,
    category: m.category,
    memoryDate: m.memoryDate,
    photos: m.linkedPhotoIds
      .map((id) => photosById.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.imageUrl))
      .map((p) => ({ id: p.id, imageUrl: p.imageUrl!, caption: p.caption })),
  }));

  return {
    seniorName: senior?.name ?? "My",
    memories: exportMemories,
  };
}

// The family tree export — first of the per-category exports planned
// alongside §17's life-story PDF (see the plan doc). Same permission model
// (senior or a contribute-permission caregiver) enforced the same way:
// requireContributor() re-checks server-side regardless of what the client
// hid.
export async function getFamilyTreeExportData(): Promise<FamilyTreeExportData> {
  const session = await requireContributor();
  const seniorId = session.activeSeniorId!;
  const [senior, people] = await Promise.all([getProfile(seniorId), getPeople(seniorId)]);

  const exportPeople: ExportPerson[] = people.map((p) => ({
    id: p.id,
    name: p.name,
    relationshipToSenior: p.relationshipToSenior,
    relationshipLabel: p.relationshipLabel,
    notes: p.notes,
    livingStatus: p.livingStatus,
    spouseId: p.spouseId,
    parentIds: p.parentIds,
  }));

  return {
    seniorName: senior?.name ?? "My",
    people: exportPeople,
  };
}

// The Photos & Family export — second of the per-category exports (§18),
// covering every photo in the account, not just ones linked to a Story
// Time memory (unlike §17's life-story PDF). Same permission gate as every
// other export/write.
export async function getPhotosExportData(): Promise<PhotosExportData> {
  const session = await requireContributor();
  const seniorId = session.activeSeniorId!;
  const [senior, photos, people] = await Promise.all([
    getProfile(seniorId),
    getPhotos(seniorId),
    getPeople(seniorId),
  ]);
  const peopleById = new Map(people.map((p) => [p.id, p]));

  const exportPhotos: ExportPhoto[] = photos.map((photo) => ({
    id: photo.id,
    label: photo.label,
    caption: photo.caption,
    dateTaken: photo.dateTaken,
    imageUrl: photo.imageUrl,
    taggedNames: [
      ...(photo.seniorTagged && senior?.name ? [senior.name] : []),
      ...photo.taggedPersonIds.map((id) => peopleById.get(id)?.name).filter((name): name is string => Boolean(name)),
    ],
  }));

  return {
    seniorName: senior?.name ?? "My",
    photos: exportPhotos,
  };
}
