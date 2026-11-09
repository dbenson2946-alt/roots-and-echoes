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

// ---- Audio clips ----
// A recorded-live or uploaded-from-outside audio clip attached to a memory
// or a song. Either kind can hold any number of these — recording live and
// uploading an existing file aren't mutually exclusive, and more can be
// added any time after the memory/song itself was created. Requires
// supabase/migration_6_recordings.sql.
export interface AudioClip {
  id: string;
  label: string;
  /** a short-lived signed URL for the file, generated fresh on each read
   * from the real Storage path (`memory_recordings.audio_path` /
   * `song_recordings.audio_path`). Undefined only for an old label-only
   * row saved before this fix, which never got a real file. */
  audioUrl?: string;
  recordedAt: string;
}

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
  /** Every recorded/uploaded audio clip attached to this memory — any
   * number, including zero. Replaces the old hasAudio boolean, which only
   * ever meant "one clip or none" and (before this fix) didn't even point
   * at a real file. See AudioClip's doc comment. */
  recordings: AudioClip[];
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
  | "great_grandchild"
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
  /** Another person already in the tree who is this person's spouse/partner
   * — always written symmetrically (if A's spouseId is B, B's spouseId is
   * A), so either side can be read. Lets a spouse/in-law be tied to a
   * specific person rather than only ever "the senior's spouse". Not used
   * for the senior's own spouse — the senior isn't a Person row, so that
   * relationship is still just relationshipToSenior === "spouse". */
  spouseId?: string;
  /** 0–2 other people already in the tree who are this person's parents,
   * as tracked here — lets a grandchild (or niece/nephew) be assigned to a
   * specific child (or aunt/uncle) instead of only landing in the general
   * "Grandchildren, Nieces & Nephews" bucket. Empty when not yet set. */
  parentIds: string[];
  /** ISO timestamp of when this person was added to the family tree */
  createdAt: string;
}

export interface Photo {
  id: string;
  seniorId: string;
  caption?: string;
  dateTaken?: string;
  taggedPersonIds: string[];
  /** Whether the senior themselves (the account owner — never a `people`
   * row, since that table is only everyone *else* in their life) is
   * tagged as present in this photo. Added in §20, since there was
   * otherwise no way to say "I'm in this one too". */
  seniorTagged: boolean;
  linkedMemoryId?: string;
  colorSwatch: string; // placeholder tile fill color, used when no image has been uploaded
  label: string; // short placeholder label shown on the tile
  /** a short-lived signed URL for the uploaded photo, generated fresh on
   * each read from the real Storage path (`photos.storage_path` in
   * supabase/schema.sql). Undefined if no image has been uploaded yet, in
   * which case the colorSwatch/label placeholder tile is shown instead. */
  imageUrl?: string;
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
  /** singing/recitation clips, recorded live or uploaded — see AudioClip's
   * doc comment. */
  recordings: AudioClip[];
  /** A link to hear this exact recording on YouTube, pasted in by a
   * contributor rather than auto-matched — this library includes older,
   * lesser-known recordings where an automatic search could easily surface
   * the wrong version/cover, which matters more than usual given Ken's
   * memory context. Plain outbound link, not an embedded player — see §27. */
  youtubeUrl?: string;
  /** ISO timestamp of when this song was added */
  createdAt: string;
}

/**
 * A second, separate capability on Story Time (see §32 of the project
 * plan), sitting alongside — not mixed into — the existing prompted
 * MemoryEntry timeline David asked to leave untouched. Where a memory is
 * a quick, prompted answer, this is a longer, standalone piece: a title,
 * a written summary (David's guideline: roughly 300-500 words, not
 * enforced here — a soft UI guideline, not a hard constraint), and one
 * or more audio clips, recorded live or uploaded from a file. Requires
 * supabase/migration_11_life_story_recordings.sql.
 */
export interface LifeStoryRecording {
  id: string;
  seniorId: string;
  title: string;
  summary: string;
  /** Every recorded/uploaded audio clip attached to this recording — any
   * number, including zero (an entry can be saved while audio is still
   * being prepared/added). A long recording can be split across several
   * clips ("Part 1" / "Part 2") rather than needing one huge file. See
   * AudioClip's own doc comment. */
  clips: AudioClip[];
  createdAt: string;
  /** who actually entered this (senior themself, or a caregiver helping) */
  enteredBy: { profileId: string; name: string; role: Role };
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
  colorSwatch: string; // placeholder tile fill color, used when no image has been uploaded
  label: string; // short placeholder label shown on the tile
  /** a short-lived signed URL for the uploaded artwork photo, generated
   * fresh on each read from the real Storage path (`art_pieces.image_path`
   * in supabase/schema.sql). Undefined if no image has been uploaded yet. */
  imageUrl?: string;
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
  | "art_added"
  | "life_story_recording_added";

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
