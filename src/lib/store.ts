import "server-only";
import { createClient } from "./supabase/server";
import { getSignedAudioUrl } from "./storage";
import type {
  Profile,
  Role,
  CustomVoice,
  CaregiverGrant,
  CaregiverPermission,
  MemoryEntry,
  MemoryCategory,
  Person,
  RelationshipType,
  Photo,
  Song,
  Book,
  ArtPiece,
  ArtMedium,
  ActivityEntry,
  ActivityType,
  VoicePreset,
} from "./types";

/*
 * REAL DATA STORE
 * ----------------
 * Every function here queries the real Supabase Postgres project defined in
 * /supabase/schema.sql (plus /supabase/migration_2_placeholder_fields.sql).
 * All reads/writes go through the request-scoped server client from
 * ./supabase/server, so every query runs as the signed-in user and is
 * subject to that project's row-level security policies — this file never
 * needs (and must never use) the Supabase secret/service-role key.
 *
 * PostgREST foreign-key embedding (`select("*, other_table(...)")`) is
 * deliberately avoided throughout in favor of separate queries + JS-side
 * joins (see fetchProfileSummaries/fetchJoinGroups below) — simpler to
 * reason about and doesn't depend on exact FK constraint names.
 */

// ---- Deterministic placeholder styling ----
// Real profile photos/avatars aren't part of this app yet, so identity
// colors and initials are computed on the fly from stable ids/names rather
// than stored — see the color/label columns added for photos/art/people in
// migration_2_placeholder_fields.sql for the same idea applied to those.

const AVATAR_COLORS = [
  "var(--color-story)",
  "var(--color-photo)",
  "var(--color-music)",
  "var(--color-primary)",
  "var(--color-art)",
];

const TINT_COLORS = [
  "var(--color-story-tint)",
  "var(--color-photo-tint)",
  "var(--color-music-tint)",
  "var(--color-primary-tint)",
  "var(--color-art-tint)",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function colorForId(id: string, palette: string[]): string {
  return palette[hashString(id) % palette.length];
}

function initialsForName(name: string): string {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

// ---- Batched-join helpers ----
// Used instead of PostgREST embedding to resolve "who entered this" /
// "who acted on this" profile summaries and many-to-many join tables
// (photo_tags, memory_people, memory_photos, memory_art) in one extra
// round trip per list, rather than one row-by-row lookup each.

interface ProfileSummary {
  id: string;
  name: string;
  role: Role;
}

async function fetchProfileSummaries(ids: string[]): Promise<Map<string, ProfileSummary>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, ProfileSummary>();
  if (unique.length === 0) return map;
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, name, role").in("id", unique);
  if (error) throw new Error(`Failed to load profiles: ${error.message}`);
  for (const row of (data ?? []) as ProfileSummary[]) {
    map.set(row.id, row);
  }
  return map;
}

async function fetchJoinGroups(
  table: string,
  groupCol: string,
  valueCol: string,
  groupIds: string[]
): Promise<Map<string, string[]>> {
  const unique = Array.from(new Set(groupIds.filter(Boolean)));
  const map = new Map<string, string[]>();
  if (unique.length === 0) return map;
  const supabase = await createClient();
  // select("*") rather than a computed column list — a non-literal string
  // can't be parsed into a precise return type by the Supabase client.
  const { data, error } = await supabase.from(table).select("*").in(groupCol, unique);
  if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
  for (const row of (data ?? []) as Record<string, string>[]) {
    const groupValue = row[groupCol];
    const value = row[valueCol];
    const arr = map.get(groupValue) ?? [];
    arr.push(value);
    map.set(groupValue, arr);
  }
  return map;
}

// ---- Profiles & read-aloud voice ----

interface ProfileRow {
  id: string;
  role: Role;
  name: string;
  relationship_label: string | null;
  voice_preference: VoicePreset | null;
  created_at: string;
}

interface CustomVoiceRow {
  profile_id: string;
  sample_audio_path: string;
  label: string;
  consent_confirmed: boolean;
  uploaded_at: string;
}

function rowToProfile(row: ProfileRow, customVoice?: CustomVoice): Profile {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    relationshipLabel: row.relationship_label ?? undefined,
    avatarInitials: initialsForName(row.name),
    avatarColor: colorForId(row.id, AVATAR_COLORS),
    voicePreference: row.voice_preference ?? undefined,
    customVoice,
  };
}

async function fetchCustomVoice(profileId: string): Promise<CustomVoice | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_voices")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error || !data) return undefined;
  const row = data as CustomVoiceRow;
  return { sampleAudioPath: row.sample_audio_path, label: row.label, uploadedAt: row.uploaded_at };
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  if (!id) return undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  const row = data as ProfileRow;
  const customVoice = row.voice_preference === "custom" ? await fetchCustomVoice(id) : undefined;
  return rowToProfile(row, customVoice);
}

/** Creates the `profiles` row for a just-authenticated Supabase Auth user
 * (the onboarding step). `id` must be that user's auth.users id. New
 * caregivers automatically claim any invites already waiting for their
 * email — see claimPendingInvites. */
export async function createProfile(input: {
  id: string;
  role: Role;
  name: string;
  relationshipLabel?: string;
}): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: input.id,
      role: input.role,
      name: input.name,
      relationship_label: input.relationshipLabel ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create profile: ${error.message}`);
  if (input.role === "caregiver") {
    await claimPendingInvites(input.id);
  }
  return rowToProfile(data as ProfileRow);
}

export async function setVoicePreference(profileId: string, preset: VoicePreset): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ voice_preference: preset }).eq("id", profileId);
  if (error) throw new Error(`Failed to set voice preference: ${error.message}`);
}

export async function setCustomVoice(
  profileId: string,
  input: { sampleAudioPath: string; label: string; consentConfirmed: boolean }
): Promise<void> {
  const supabase = await createClient();
  const { error: upsertError } = await supabase.from("custom_voices").upsert({
    profile_id: profileId,
    sample_audio_path: input.sampleAudioPath,
    label: input.label,
    consent_confirmed: input.consentConfirmed,
    uploaded_at: new Date().toISOString(),
  });
  if (upsertError) throw new Error(`Failed to save custom voice: ${upsertError.message}`);
  const { error: prefError } = await supabase
    .from("profiles")
    .update({ voice_preference: "custom" })
    .eq("id", profileId);
  if (prefError) throw new Error(`Failed to set voice preference: ${prefError.message}`);
}

// ---- Caregiver grants ----

interface GrantRow {
  id: string;
  caregiver_id: string;
  senior_id: string;
  permission: CaregiverPermission;
  granted_at: string;
  revoked_at: string | null;
}

function rowToGrant(row: GrantRow): CaregiverGrant {
  return {
    id: row.id,
    caregiverId: row.caregiver_id,
    seniorId: row.senior_id,
    permission: row.permission,
    grantedAt: row.granted_at,
    revokedAt: row.revoked_at ?? null,
  };
}

export async function getActiveGrantsForCaregiver(caregiverId: string): Promise<CaregiverGrant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("caregiver_grants")
    .select("*")
    .eq("caregiver_id", caregiverId)
    .is("revoked_at", null);
  if (error) throw new Error(`Failed to load caregiver grants: ${error.message}`);
  return ((data ?? []) as GrantRow[]).map(rowToGrant);
}

export async function getActiveGrantsForSenior(seniorId: string): Promise<CaregiverGrant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("caregiver_grants")
    .select("*")
    .eq("senior_id", seniorId)
    .is("revoked_at", null);
  if (error) throw new Error(`Failed to load caregiver grants: ${error.message}`);
  return ((data ?? []) as GrantRow[]).map(rowToGrant);
}

export async function getGrant(caregiverId: string, seniorId: string): Promise<CaregiverGrant | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("caregiver_grants")
    .select("*")
    .eq("caregiver_id", caregiverId)
    .eq("senior_id", seniorId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return undefined;
  return rowToGrant(data as GrantRow);
}

export async function revokeGrant(grantId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("caregiver_grants")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", grantId);
  if (error) throw new Error(`Failed to revoke access: ${error.message}`);
}

// ---- Caregiver invites by email ----
// See migration_2_placeholder_fields.sql for the pending_invites table and
// the extra RLS policies this depends on (a caregiver may only ever claim
// a grant for *themselves*, and only when a matching invite exists).

export interface PendingInvite {
  id: string;
  seniorId: string;
  seniorName: string;
  email: string;
  permission: CaregiverPermission;
  createdAt: string;
}

interface PendingInviteRow {
  id: string;
  senior_id: string;
  senior_name: string;
  email: string;
  permission: CaregiverPermission;
  created_at: string;
}

function rowToPendingInvite(row: PendingInviteRow): PendingInvite {
  return {
    id: row.id,
    seniorId: row.senior_id,
    seniorName: row.senior_name,
    email: row.email,
    permission: row.permission,
    createdAt: row.created_at,
  };
}

export async function inviteCaregiverByEmail(
  seniorId: string,
  seniorName: string,
  email: string,
  permission: CaregiverPermission
): Promise<void> {
  const supabase = await createClient();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("An email address is required.");
  const { error } = await supabase.from("pending_invites").upsert(
    { senior_id: seniorId, senior_name: seniorName, email: normalizedEmail, permission },
    { onConflict: "senior_id,email" }
  );
  if (error) throw new Error(`Failed to invite caregiver: ${error.message}`);
}

export async function getPendingInvitesForSenior(seniorId: string): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pending_invites")
    .select("*")
    .eq("senior_id", seniorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load invites: ${error.message}`);
  return ((data ?? []) as PendingInviteRow[]).map(rowToPendingInvite);
}

export async function cancelPendingInvite(inviteId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("pending_invites").delete().eq("id", inviteId);
  if (error) throw new Error(`Failed to cancel invite: ${error.message}`);
}

/** Turns every pending invite addressed to the *currently signed-in* user's
 * own email into a real caregiver_grants row for `profileId` (that user's
 * own profile id), then removes the claimed invites. Reads the email from
 * the live Supabase Auth session (never from a caller-supplied value) so
 * this can never be used to claim someone else's invite. */
async function claimPendingInvites(profileId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;
  const email = user.email.toLowerCase();

  const { data, error } = await supabase.from("pending_invites").select("*").eq("email", email);
  if (error || !data || data.length === 0) return;

  for (const invite of data as PendingInviteRow[]) {
    const { error: insertError } = await supabase.from("caregiver_grants").insert({
      caregiver_id: profileId,
      senior_id: invite.senior_id,
      permission: invite.permission,
    });
    if (insertError) {
      // Most likely a previously-revoked grant already exists for this
      // caregiver/senior pair (unique constraint) — reactivate it instead.
      await supabase
        .from("caregiver_grants")
        .update({ permission: invite.permission, revoked_at: null, granted_at: new Date().toISOString() })
        .eq("caregiver_id", profileId)
        .eq("senior_id", invite.senior_id);
    }
    await supabase.from("pending_invites").delete().eq("id", invite.id);
  }
}

/** Same claim, for an *existing* caregiver profile revisiting the account
 * switcher — covers the case where they were invited after they already
 * had an account (so onboarding never ran claimPendingInvites for them). */
export async function refreshClaimedInvites(profileId: string): Promise<void> {
  await claimPendingInvites(profileId);
}

// ---- Story Time / memories ----

interface MemoryRow {
  id: string;
  senior_id: string;
  entered_by: string;
  category: MemoryCategory;
  title: string;
  transcript: string;
  memory_date: string | null;
  prompt: string | null;
  has_audio: boolean;
  recorded_at: string;
}

async function rowsToMemories(rows: MemoryRow[]): Promise<MemoryEntry[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [profiles, personLinks, photoLinks, artLinks] = await Promise.all([
    fetchProfileSummaries(rows.map((r) => r.entered_by)),
    fetchJoinGroups("memory_people", "memory_id", "person_id", ids),
    fetchJoinGroups("memory_photos", "memory_id", "photo_id", ids),
    fetchJoinGroups("memory_art", "memory_id", "art_id", ids),
  ]);
  return rows.map((row) => {
    const actor = profiles.get(row.entered_by);
    return {
      id: row.id,
      seniorId: row.senior_id,
      category: row.category,
      title: row.title,
      transcript: row.transcript,
      memoryDate: row.memory_date ?? undefined,
      recordedAt: row.recorded_at,
      prompt: row.prompt ?? undefined,
      hasAudio: row.has_audio ?? false,
      linkedPersonIds: personLinks.get(row.id) ?? [],
      linkedPhotoIds: photoLinks.get(row.id) ?? [],
      linkedArtIds: artLinks.get(row.id) ?? [],
      enteredBy: actor
        ? { profileId: actor.id, name: actor.name, role: actor.role }
        : { profileId: row.entered_by, name: "Unknown", role: "senior" as Role },
    };
  });
}

export async function getMemories(seniorId: string): Promise<MemoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_entries")
    .select("*")
    .eq("senior_id", seniorId)
    .order("recorded_at", { ascending: false });
  if (error) throw new Error(`Failed to load memories: ${error.message}`);
  return rowsToMemories((data ?? []) as MemoryRow[]);
}

export async function getMemory(id: string): Promise<MemoryEntry | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("memory_entries").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  const [entry] = await rowsToMemories([data as MemoryRow]);
  return entry;
}

export async function addMemory(input: Omit<MemoryEntry, "id" | "recordedAt">): Promise<MemoryEntry> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_entries")
    .insert({
      senior_id: input.seniorId,
      entered_by: input.enteredBy.profileId,
      category: input.category,
      title: input.title,
      transcript: input.transcript,
      memory_date: input.memoryDate ?? null,
      prompt: input.prompt ?? null,
      has_audio: input.hasAudio,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add memory: ${error.message}`);

  const memoryId = (data as MemoryRow).id;
  const linkInserts: PromiseLike<unknown>[] = [];
  if (input.linkedPersonIds.length > 0) {
    linkInserts.push(
      supabase
        .from("memory_people")
        .insert(input.linkedPersonIds.map((personId) => ({ memory_id: memoryId, person_id: personId })))
    );
  }
  if (input.linkedPhotoIds.length > 0) {
    linkInserts.push(
      supabase
        .from("memory_photos")
        .insert(input.linkedPhotoIds.map((photoId) => ({ memory_id: memoryId, photo_id: photoId })))
    );
  }
  if (input.linkedArtIds.length > 0) {
    linkInserts.push(
      supabase.from("memory_art").insert(input.linkedArtIds.map((artId) => ({ memory_id: memoryId, art_id: artId })))
    );
  }
  await Promise.all(linkInserts);

  const created = await getMemory(memoryId);
  if (!created) throw new Error("Failed to load newly created memory.");
  return created;
}

const PROMPTS = [
  "Tell me about a place that always makes you feel at home.",
  "What's a family tradition you remember fondly?",
  "Tell me about someone who taught you something important.",
  "What's a meal that brings back a strong memory?",
  "Tell me about a trip you'll never forget.",
  "What did you want to be when you were young, and why?",
  "Tell me about a moment you felt really proud.",
  "What's a piece of advice you were given that stuck with you?",
];

export async function getNextPrompt(seniorId: string): Promise<string> {
  const memories = await getMemories(seniorId);
  const asked = new Set(memories.map((m) => m.prompt).filter(Boolean));
  const remaining = PROMPTS.filter((p) => !asked.has(p));
  const pool = remaining.length > 0 ? remaining : PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---- People / family tree ----

interface PersonRow {
  id: string;
  senior_id: string;
  name: string;
  relationship_to_senior: RelationshipType;
  relationship_label: string | null;
  notes: string | null;
  living_status: "living" | "deceased" | "unknown" | null;
  photo_initials: string | null;
  photo_color: string | null;
  created_at: string;
}

function rowToPerson(row: PersonRow): Person {
  return {
    id: row.id,
    seniorId: row.senior_id,
    name: row.name,
    relationshipToSenior: row.relationship_to_senior,
    relationshipLabel: row.relationship_label ?? undefined,
    notes: row.notes ?? undefined,
    photoInitials: row.photo_initials ?? initialsForName(row.name),
    photoColor: row.photo_color ?? colorForId(row.id, TINT_COLORS),
    livingStatus: row.living_status ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getPeople(seniorId: string): Promise<Person[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("senior_id", seniorId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load people: ${error.message}`);
  return ((data ?? []) as PersonRow[]).map(rowToPerson);
}

export async function getPerson(id: string): Promise<Person | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("people").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return rowToPerson(data as PersonRow);
}

export async function addPerson(input: Omit<Person, "id" | "createdAt">): Promise<Person> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .insert({
      senior_id: input.seniorId,
      name: input.name,
      relationship_to_senior: input.relationshipToSenior,
      relationship_label: input.relationshipLabel ?? null,
      notes: input.notes ?? null,
      living_status: input.livingStatus ?? "living",
      photo_initials: input.photoInitials,
      photo_color: input.photoColor,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add person: ${error.message}`);
  return rowToPerson(data as PersonRow);
}

// ---- Photos ----

interface PhotoRow {
  id: string;
  senior_id: string;
  caption: string | null;
  date_taken: string | null;
  linked_memory_id: string | null;
  color_swatch: string | null;
  label: string | null;
  created_at: string;
}

async function rowsToPhotos(rows: PhotoRow[]): Promise<Photo[]> {
  if (rows.length === 0) return [];
  const tags = await fetchJoinGroups(
    "photo_tags",
    "photo_id",
    "person_id",
    rows.map((r) => r.id)
  );
  return rows.map((row) => ({
    id: row.id,
    seniorId: row.senior_id,
    caption: row.caption ?? undefined,
    dateTaken: row.date_taken ?? undefined,
    taggedPersonIds: tags.get(row.id) ?? [],
    linkedMemoryId: row.linked_memory_id ?? undefined,
    colorSwatch: row.color_swatch ?? colorForId(row.id, TINT_COLORS),
    label: row.label ?? "Untitled photo",
    createdAt: row.created_at,
  }));
}

export async function getPhotos(seniorId: string): Promise<Photo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("senior_id", seniorId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load photos: ${error.message}`);
  return rowsToPhotos((data ?? []) as PhotoRow[]);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("photos").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  const [photo] = await rowsToPhotos([data as PhotoRow]);
  return photo;
}

export async function tagPersonInPhoto(photoId: string, personId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("photo_tags")
    .upsert({ photo_id: photoId, person_id: personId }, { onConflict: "photo_id,person_id" });
  if (error) throw new Error(`Failed to tag photo: ${error.message}`);
}

export async function setPhotoCaption(photoId: string, caption: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("photos").update({ caption }).eq("id", photoId);
  if (error) throw new Error(`Failed to save caption: ${error.message}`);
}

export async function addPhoto(input: Omit<Photo, "id" | "createdAt">): Promise<Photo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .insert({
      senior_id: input.seniorId,
      caption: input.caption ?? null,
      date_taken: input.dateTaken ?? null,
      linked_memory_id: input.linkedMemoryId ?? null,
      color_swatch: input.colorSwatch,
      label: input.label,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add photo: ${error.message}`);
  const photoId = (data as PhotoRow).id;
  if (input.taggedPersonIds.length > 0) {
    await supabase
      .from("photo_tags")
      .insert(input.taggedPersonIds.map((personId) => ({ photo_id: photoId, person_id: personId })));
  }
  const photo = await getPhoto(photoId);
  if (!photo) throw new Error("Failed to load newly created photo.");
  return photo;
}

// ---- Songs ----

interface SongRow {
  id: string;
  senior_id: string;
  title: string;
  artist: string | null;
  lyrics: string | null;
  personal_note: string | null;
  audio_path: string | null;
  created_at: string;
}

interface SongRecordingRow {
  id: string;
  song_id: string;
  label: string;
  recorded_at: string;
}

async function rowsToSongs(rows: SongRow[]): Promise<Song[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const supabase = await createClient();
  const { data: recRows, error } = await supabase
    .from("song_recordings")
    .select("id, song_id, label, recorded_at")
    .in("song_id", ids)
    .order("recorded_at", { ascending: true });
  if (error) throw new Error(`Failed to load recordings: ${error.message}`);

  const recordingsBySong = new Map<string, { id: string; label: string; recordedAt: string }[]>();
  for (const r of (recRows ?? []) as SongRecordingRow[]) {
    const arr = recordingsBySong.get(r.song_id) ?? [];
    arr.push({ id: r.id, label: r.label, recordedAt: r.recorded_at });
    recordingsBySong.set(r.song_id, arr);
  }

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      seniorId: row.senior_id,
      title: row.title,
      artist: row.artist ?? undefined,
      lyrics: row.lyrics ?? "",
      personalNote: row.personal_note ?? undefined,
      audioUrl: row.audio_path ? (await getSignedAudioUrl(row.audio_path)) ?? undefined : undefined,
      recordings: recordingsBySong.get(row.id) ?? [],
      createdAt: row.created_at,
    }))
  );
}

export async function getSongs(seniorId: string): Promise<Song[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("senior_id", seniorId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load songs: ${error.message}`);
  return rowsToSongs((data ?? []) as SongRow[]);
}

export async function getSong(id: string): Promise<Song | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("songs").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  const [song] = await rowsToSongs([data as SongRow]);
  return song;
}

export async function addSong(input: {
  seniorId: string;
  title: string;
  artist?: string;
  lyrics: string;
  personalNote?: string;
  /** Storage path (`audio` bucket), if a file was uploaded at creation time. */
  audioPath?: string;
}): Promise<Song> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .insert({
      senior_id: input.seniorId,
      title: input.title,
      artist: input.artist ?? null,
      lyrics: input.lyrics ?? null,
      personal_note: input.personalNote ?? null,
      audio_path: input.audioPath ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add song: ${error.message}`);
  const song = await getSong((data as SongRow).id);
  if (!song) throw new Error("Failed to load newly created song.");
  return song;
}

export async function addRecordingToSong(songId: string, label: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("song_recordings").insert({ song_id: songId, label });
  if (error) throw new Error(`Failed to add recording: ${error.message}`);
}

export async function setSongAudioPath(songId: string, audioPath: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("songs").update({ audio_path: audioPath }).eq("id", songId);
  if (error) throw new Error(`Failed to save song audio: ${error.message}`);
}

// ---- Books ----

interface BookRow {
  id: string;
  senior_id: string;
  title: string;
  author: string | null;
  personal_note: string | null;
  created_at: string;
}

function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    seniorId: row.senior_id,
    title: row.title,
    author: row.author ?? undefined,
    personalNote: row.personal_note ?? undefined,
    recordedAt: row.created_at,
  };
}

export async function getBooks(seniorId: string): Promise<Book[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("senior_id", seniorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load books: ${error.message}`);
  return ((data ?? []) as BookRow[]).map(rowToBook);
}

export async function getBook(id: string): Promise<Book | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return rowToBook(data as BookRow);
}

export async function addBook(input: Omit<Book, "id" | "recordedAt">): Promise<Book> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .insert({
      senior_id: input.seniorId,
      title: input.title,
      author: input.author ?? null,
      personal_note: input.personalNote ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add book: ${error.message}`);
  return rowToBook(data as BookRow);
}

// ---- Art ----

interface ArtPieceRow {
  id: string;
  senior_id: string;
  medium: ArtMedium;
  title: string;
  artist: string | null;
  personal_note: string | null;
  prompt: string | null;
  linked_memory_id: string | null;
  color_swatch: string | null;
  label: string | null;
  created_at: string;
}

function rowToArtPiece(row: ArtPieceRow): ArtPiece {
  return {
    id: row.id,
    seniorId: row.senior_id,
    medium: row.medium,
    title: row.title,
    artist: row.artist ?? undefined,
    personalNote: row.personal_note ?? undefined,
    prompt: row.prompt ?? undefined,
    recordedAt: row.created_at,
    linkedMemoryId: row.linked_memory_id ?? undefined,
    colorSwatch: row.color_swatch ?? colorForId(row.id, TINT_COLORS),
    label: row.label ?? row.title,
  };
}

export async function getArtPieces(seniorId: string): Promise<ArtPiece[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("art_pieces")
    .select("*")
    .eq("senior_id", seniorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load art pieces: ${error.message}`);
  return ((data ?? []) as ArtPieceRow[]).map(rowToArtPiece);
}

export async function getArtPiece(id: string): Promise<ArtPiece | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("art_pieces").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return rowToArtPiece(data as ArtPieceRow);
}

export async function addArtPiece(input: Omit<ArtPiece, "id" | "recordedAt">): Promise<ArtPiece> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("art_pieces")
    .insert({
      senior_id: input.seniorId,
      medium: input.medium,
      title: input.title,
      artist: input.artist ?? null,
      personal_note: input.personalNote ?? null,
      prompt: input.prompt ?? null,
      linked_memory_id: input.linkedMemoryId ?? null,
      color_swatch: input.colorSwatch,
      label: input.label,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add art piece: ${error.message}`);
  return rowToArtPiece(data as ArtPieceRow);
}

const ART_PROMPTS = [
  "Tell me about a piece of art that has stayed with you.",
  "Have you ever seen a painting, sculpture, or photograph in person that took your breath away?",
  "Is there an artist whose work you've always admired?",
  "What's a piece of art someone close to you loved?",
  "Tell me about art you saw on a trip you took.",
  "Is there a picture or sculpture that reminds you of someone?",
];

export async function getNextArtPrompt(seniorId: string): Promise<string> {
  const pieces = await getArtPieces(seniorId);
  const asked = new Set(pieces.map((a) => a.prompt).filter(Boolean));
  const remaining = ART_PROMPTS.filter((p) => !asked.has(p));
  const pool = remaining.length > 0 ? remaining : ART_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---- Activity tracker ----

interface ActivityRow {
  id: string;
  senior_id: string;
  acted_by: string;
  type: ActivityType;
  summary: string;
  occurred_at: string;
}

async function rowsToActivity(rows: ActivityRow[]): Promise<ActivityEntry[]> {
  if (rows.length === 0) return [];
  const profiles = await fetchProfileSummaries(rows.map((r) => r.acted_by));
  return rows.map((row) => {
    const actor = profiles.get(row.acted_by);
    return {
      id: row.id,
      seniorId: row.senior_id,
      type: row.type,
      summary: row.summary,
      actedBy: actor
        ? { profileId: actor.id, name: actor.name, role: actor.role }
        : { profileId: row.acted_by, name: "Unknown", role: "senior" as Role },
      occurredAt: row.occurred_at,
    };
  });
}

export async function getActivity(seniorId: string, limit?: number): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("activity_log")
    .select("*")
    .eq("senior_id", seniorId)
    .order("occurred_at", { ascending: false });
  if (typeof limit === "number") query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load activity: ${error.message}`);
  return rowsToActivity((data ?? []) as ActivityRow[]);
}

export async function addActivity(input: Omit<ActivityEntry, "id" | "occurredAt">): Promise<ActivityEntry> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .insert({
      senior_id: input.seniorId,
      acted_by: input.actedBy.profileId,
      type: input.type,
      summary: input.summary,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to log activity: ${error.message}`);
  const [entry] = await rowsToActivity([data as ActivityRow]);
  return entry;
}

export interface ActivityStats {
  totalItems: number;
  categoryCounts: {
    memories: number;
    people: number;
    photos: number;
    songs: number;
    books: number;
    art: number;
  };
  totalActivityEvents: number;
  firstActivityAt?: string;
  lastActivityAt?: string;
  /** distinct calendar days, in the last 30, with at least one activity */
  activeDaysLast30: number;
  /** one entry per day for the last 14 days, oldest first — for a small
   * "activity over time" bar strip */
  dailyCounts: { date: string; count: number }[];
}

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

export async function getActivityStats(seniorId: string): Promise<ActivityStats> {
  const [events, memories, people, photos, songs, books, art] = await Promise.all([
    getActivity(seniorId), // newest first
    getMemories(seniorId),
    getPeople(seniorId),
    getPhotos(seniorId),
    getSongs(seniorId),
    getBooks(seniorId),
    getArtPieces(seniorId),
  ]);

  const categoryCounts = {
    memories: memories.length,
    people: people.length,
    photos: photos.length,
    songs: songs.length,
    books: books.length,
    art: art.length,
  };
  const totalItems = Object.values(categoryCounts).reduce((sum, n) => sum + n, 0);

  const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeDaySet30 = new Set<string>();
  for (const e of events) {
    if (new Date(e.occurredAt).getTime() >= cutoff30) activeDaySet30.add(dayKey(e.occurredAt));
  }

  const dailyCounts: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = events.filter((e) => dayKey(e.occurredAt) === key).length;
    dailyCounts.push({ date: key, count });
  }

  return {
    totalItems,
    categoryCounts,
    totalActivityEvents: events.length,
    firstActivityAt: events.length > 0 ? events[events.length - 1].occurredAt : undefined,
    lastActivityAt: events.length > 0 ? events[0].occurredAt : undefined,
    activeDaysLast30: activeDaySet30.size,
    dailyCounts,
  };
}
