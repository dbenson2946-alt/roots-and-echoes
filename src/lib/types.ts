// Core data model for Roots & Echoes.
// Mirrors the tables defined in /supabase/schema.sql so the mock store here
// can later be swapped for real Supabase queries without reshaping the UI.

export type Role = "senior" | "caregiver";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  /** short relationship label shown in the caregiver switcher, e.g. "son" */
  relationshipLabel?: string;
  avatarInitials: string;
  avatarColor: string; // one of the mode/tint colors, for a friendly identity color
  /** which voice reads content aloud for this account (senior accounts only
   * in practice); defaults to "default" when unset */
  voicePreference?: VoicePreset;
  customVoice?: CustomVoice;
}

// ---- Read-aloud voice ----
// The senior (or whoever manages their account) can pick which voice reads
// prompts/transcripts/lyrics aloud throughout the app. "default" and the two
// AI presets all use the browser's own text-to-speech engine with different
// rate/pitch/voice choices; "custom" is modeled after an uploaded recording.
//
// Real voice cloning needs a paid third-party provider (e.g. ElevenLabs) with
// its own API key — not something this app can do on its own. Until one is
// connected, "custom" plays back using one of the browser's own voices too,
// clearly noted as a stand-in on the Settings page where it's set up.

export type VoicePreset = "default" | "warm" | "bright" | "custom";

export interface CustomVoice {
  /** Supabase Storage path (`audio` bucket) of the uploaded sample — not
   * actually used to synthesize speech yet (see the voice_preference doc
   * comment in supabase/schema.sql for why: real voice cloning needs a
   * paid third-party provider). */
  sampleAudioPath: string;
  /** friendly name the user gave it, e.g. "Grandma's voice" */
  label: string;
  uploadedAt: string;
}

export type CaregiverPermission = "contribute" | "view_only";

export interface CaregiverGrant {
  id: string;
  caregiverId: string;
  seniorId: string;
  permission: CaregiverPermission;
  grantedAt: string;
  revokedAt?: string | null;
}

export type MemoryCategory =
  | "childhood"
  | "family"
  | "work"
  | "travel"
  | "music"
  | "love"
  | "milestone"
  | "other";

export interface MemoryEntry {
  id: string;
  seniorId: string;
  category: MemoryCategory;
  title: string;
  transcript: string;
  /** approximate date/decade of the memory itself, free text ("Summer 1968") */
  memoryDate?: string;
  /** ISO timestamp of when it was recorded */
  recordedAt: string;
  prompt?: string;
  hasAudio: boolean;
  linkedPersonIds: string[];
  linkedPhotoIds: string[];
  linkedArtIds: string[];
  /** who actually entered this (senior themself, or a caregiver helping) */
  enteredBy: { profileId: string; name: string; role: Role };
}

export type RelationshipType =
  | "parent"
  | "child"
  | "sibling"
  | "spouse"
  | "grandparent"
  | "grandchild"
  | "aunt_uncle"
  | "niece_nephew"
  | "friend"
  | "other";

export interface Person {
  id: string;
  seniorId: string;
  name: string;
  relationshipToSenior: RelationshipType;
  relationshipLabel?: string; // free text override, e.g. "Best friend since college"
  notes?: string;
  photoInitials: string;
  photoColor: string;
  livingStatus?: "living" | "deceased" | "unknown";
  /** ISO timestamp of when this person was added to the family tree */
  createdAt: string;
}

export interface Photo {
  id: string;
  seniorId: string;
  caption?: string;
  dateTaken?: string;
  taggedPersonIds: string[];
  linkedMemoryId?: string;
  colorSwatch: string; // placeholder "image" fill color since no real files yet
  label: string; // short placeholder label shown on the tile
  /** ISO timestamp of when this photo was added to the app (distinct from
   * dateTaken, which is when the photo itself was taken) */
  createdAt: string;
}

export interface Song {
  id: string;
  seniorId: string;
  title: string;
  artist?: string;
  lyrics: string;
  personalNote?: string;
  /** a short-lived signed URL for the playable track, generated fresh on
   * each read from the real Storage path (`songs.audio_path` in
   * supabase/schema.sql). Undefined if no audio has been uploaded yet. */
  audioUrl?: string;
  recordings: { id: string; label: string; recordedAt: string }[];
  /** ISO timestamp of when this song was added */
  createdAt: string;
}

export interface Book {
  id: string;
  seniorId: string;
  title: string;
  author?: string;
  /** why it mattered, what it's about, who recommended it, etc. */
  personalNote?: string;
  recordedAt: string;
}

export type ArtMedium = "painting" | "sculpture" | "photography" | "other";

export interface ArtPiece {
  id: string;
  seniorId: string;
  medium: ArtMedium;
  title: string;
  artist?: string;
  /** why it made an impression, where they saw it, personal connection, etc. */
  personalNote?: string;
  prompt?: string;
  recordedAt: string;
  linkedMemoryId?: string;
  colorSwatch: string; // placeholder "image" fill color since no real files yet
  label: string; // short placeholder label shown on the tile
}

// ---- Activity tracker ----
// A lightweight, append-only log of "something was added" events across every
// category, used to power the Activity page (recent activity feed + high
// level usage stats) for both the senior and any caregiver helping them.

export type ActivityType =
  | "memory_added"
  | "person_added"
  | "photo_added"
  | "photo_tagged"
  | "photo_caption_added"
  | "song_added"
  | "song_audio_added"
  | "recording_added"
  | "book_added"
  | "art_added";

export interface ActivityEntry {
  id: string;
  seniorId: string;
  type: ActivityType;
  /** human-readable, e.g. "Added a memory: How I met Harold" */
  summary: string;
  actedBy: { profileId: string; name: string; role: Role };
  occurredAt: string;
}

export interface CurrentSession {
  profileId: string;
  /** for caregivers: which senior's account they are currently helping */
  activeSeniorId?: string;
}
