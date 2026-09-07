"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  setActiveSenior,
  getResolvedSession,
  setTextSize,
} from "@/lib/session";
import {
  addMemory,
  addPerson,
  getPerson,
  tagPersonInPhoto,
  setPhotoCaption,
  addPhoto,
  getPhoto,
  addSong,
  getSongs,
  getSong,
  addRecordingToSong,
  setSongAudioPath,
  addBook,
  addArtPiece,
  addActivity,
  getGrant,
  createProfile,
  revokeGrant,
  inviteCaregiverByEmail,
  cancelPendingInvite,
  setVoicePreference,
  setCustomVoice,
} from "@/lib/store";
import { uploadAudioFile } from "@/lib/storage";
import type { MemoryCategory, RelationshipType, ArtMedium, VoicePreset, Role, CaregiverPermission } from "@/lib/types";

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

export async function submitMemory(formData: FormData) {
  const session = await requireContributor();
  const title = String(formData.get("title") || "").trim();
  const transcript = String(formData.get("transcript") || "").trim();
  const category = String(formData.get("category") || "other") as MemoryCategory;
  const memoryDate = String(formData.get("memoryDate") || "").trim() || undefined;
  const prompt = String(formData.get("prompt") || "").trim() || undefined;
  const hasAudio = formData.get("hasAudio") === "true";

  if (!title || !transcript) return;

  await addMemory({
    seniorId: session.activeSeniorId!,
    category,
    title,
    transcript,
    memoryDate,
    prompt,
    hasAudio,
    linkedPersonIds: [],
    linkedPhotoIds: [],
    linkedArtIds: [],
    enteredBy: {
      profileId: session.profile.id,
      name: session.profile.name,
      role: session.profile.role,
    },
  });
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "memory_added",
    summary: `Added a memory: "${title}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });

  revalidatePath("/story-time");
}

// ---- Photos & Family ----

export async function submitNewPerson(formData: FormData) {
  const session = await requireContributor();
  const name = String(formData.get("name") || "").trim();
  const relationshipToSenior = String(formData.get("relationship") || "other") as RelationshipType;
  const relationshipLabel = String(formData.get("relationshipLabel") || "").trim() || undefined;
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

export async function submitPhotoTag(formData: FormData) {
  const session = await requireContributor();
  const photoId = String(formData.get("photoId") || "");
  const personId = String(formData.get("personId") || "");
  if (!photoId || !personId) return;
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

export async function submitNewPhoto(formData: FormData) {
  const session = await requireContributor();
  const label = String(formData.get("label") || "").trim();
  const caption = String(formData.get("caption") || "").trim() || undefined;
  const dateTaken = String(formData.get("dateTaken") || "").trim() || undefined;
  if (!label) return;

  const swatches = ["var(--color-story-tint)", "var(--color-photo-tint)", "var(--color-music-tint)", "var(--color-primary-tint)"];

  await addPhoto({
    seniorId: session.activeSeniorId!,
    label,
    caption,
    dateTaken,
    taggedPersonIds: [],
    colorSwatch: swatches[Math.floor(Math.random() * swatches.length)],
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

// ---- Music ----

export async function submitNewSong(formData: FormData) {
  const session = await requireContributor();
  const title = String(formData.get("title") || "").trim();
  const artist = String(formData.get("artist") || "").trim() || undefined;
  const lyrics = String(formData.get("lyrics") || "").trim();
  const personalNote = String(formData.get("personalNote") || "").trim() || undefined;
  if (!title) return;

  const audioFile = formData.get("audioFile");
  const audioPath =
    audioFile instanceof File && audioFile.size > 0
      ? await uploadAudioFile(session.activeSeniorId!, audioFile)
      : undefined;

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

export async function submitSongAudio(formData: FormData) {
  const session = await requireContributor();
  const songId = String(formData.get("songId") || "");
  const audioFile = formData.get("audioFile");
  if (!songId || !(audioFile instanceof File) || audioFile.size === 0) return;
  const audioPath = await uploadAudioFile(session.activeSeniorId!, audioFile);
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

export async function submitRecording(formData: FormData) {
  const session = await requireContributor();
  const songId = String(formData.get("songId") || "");
  const label = String(formData.get("label") || "New recording");
  if (!songId) return;
  await addRecordingToSong(songId, label);
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

  await addArtPiece({
    seniorId: session.activeSeniorId!,
    medium,
    title,
    artist,
    personalNote,
    prompt,
    colorSwatch: swatches[Math.floor(Math.random() * swatches.length)],
    label: title,
  });
  await addActivity({
    seniorId: session.activeSeniorId!,
    type: "art_added",
    summary: `Added an art piece: "${title}"`,
    actedBy: { profileId: session.profile.id, name: session.profile.name, role: session.profile.role },
  });

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
  const audioFile = formData.get("audioFile");
  if (!consent || !(audioFile instanceof File) || audioFile.size === 0) return;
  const sampleAudioPath = await uploadAudioFile(session.profile.id, audioFile);
  await setCustomVoice(session.profile.id, {
    sampleAudioPath,
    label,
    consentConfirmed: consent,
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}
