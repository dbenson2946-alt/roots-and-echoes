import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Real Supabase Storage uploads: song audio + the custom read-aloud voice
 * sample (the `audio` bucket), and photo/art-piece images (the `photos`
 * bucket) — both buckets and their RLS policies already exist, see
 * supabase/storage.sql. Photos and art pieces still fall back to a
 * generated placeholder tile (see src/lib/ui.ts) when no image has been
 * uploaded yet.
 *
 * Objects are stored as `<seniorId>/<random>-<filename>` within the bucket,
 * matching the folder-prefix convention the RLS policies in
 * supabase/storage.sql check against.
 *
 * Photo/art-image uploads, and — as of the audio-upload-ceiling fix below —
 * every audio upload too, deliberately do NOT route the file's bytes
 * through a Server Action. Vercel caps every function request body at a
 * hard, non-configurable 4.5MB
 * (https://vercel.com/docs/functions/limitations#request-body-size), and a
 * real phone photo or a multi-minute voice recording routinely exceeds
 * that. Instead, a `create*UploadTicket` function mints a short-lived
 * Supabase Storage signed upload URL/token server-side (this step still
 * needs the server client, to run the bucket's "insert" RLS check as the
 * signed-in user), and the browser uploads the file straight to Supabase
 * Storage with it (`supabase.storage.from(...).uploadToSignedUrl(...)` from
 * a Client Component, using the anon-key browser client) — bypassing the
 * Vercel function, and its size limit, entirely. Only the resulting storage
 * path (a short string) ever crosses back through a Server Action.
 *
 * Audio used to upload through a Server Action (bounded by next.config.ts's
 * 4MB body limit) — a deliberately simpler choice made when recordings were
 * first built (see supabase/migration_6_recordings.sql's header). Moved to
 * this same ticket pattern once that 4MB ceiling proved too tight for a
 * real recording; see supabase/migration_9_audio_bucket_size_limit.sql and
 * MAX_AUDIO_UPLOAD_BYTES in src/lib/ui.ts for the new (100MB) limit.
 */

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/** Private buckets need a signed URL per request rather than a public one. */
export async function getSignedAudioUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("audio").createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export type UploadTicket = { path: string; token: string };
/** @deprecated kept as an alias — callers written against the original
 * photo-only name still work unchanged. */
export type ImageUploadTicket = UploadTicket;

/**
 * Mints a one-time signed upload slot in the `photos` bucket for this
 * senior, without touching the file itself — the caller (a Server Action)
 * hands `path`/`token` back to the browser, which uploads directly to
 * Supabase Storage with them. See the file-level note above for why.
 */
export async function createImageUploadTicket(seniorId: string, fileName: string): Promise<UploadTicket> {
  const supabase = await createClient();
  const path = `${seniorId}/${crypto.randomUUID()}-${safeFileName(fileName || "photo")}`;
  const { data, error } = await supabase.storage.from("photos").createSignedUploadUrl(path);
  if (error) throw new Error(`Failed to prepare upload: ${error.message}`);
  return { path: data.path, token: data.token };
}

/**
 * Same idea as createImageUploadTicket, for the `audio` bucket — used for
 * song audio, memory/song recordings, and the custom read-aloud voice
 * sample, all three of which used to go through uploadAudioFile (removed)
 * and its Server Action body-size ceiling.
 */
export async function createAudioUploadTicket(seniorId: string, fileName: string): Promise<UploadTicket> {
  const supabase = await createClient();
  const path = `${seniorId}/${crypto.randomUUID()}-${safeFileName(fileName || "audio")}`;
  const { data, error } = await supabase.storage.from("audio").createSignedUploadUrl(path);
  if (error) throw new Error(`Failed to prepare upload: ${error.message}`);
  return { path: data.path, token: data.token };
}

/** Private buckets need a signed URL per request rather than a public one. */
export async function getSignedPhotoUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("photos").createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

/**
 * Deletes the actual image file for a deleted photo — see
 * store.ts's deletePhoto, which calls this after (successfully) removing
 * the database row. Requires supabase/migration_3_edit_delete.sql (adds
 * the storage.objects delete policy this depends on). Failures here are
 * swallowed rather than thrown: the database row is already gone by the
 * time this runs, so there's nothing left to roll back to, and a leaked
 * file is a much smaller problem than a photo the user can't get rid of.
 */
export async function deletePhotoFile(path: string): Promise<void> {
  if (!path) return;
  const supabase = await createClient();
  await supabase.storage.from("photos").remove([path]);
}
