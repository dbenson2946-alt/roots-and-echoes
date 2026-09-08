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
 * Photo/art-image uploads deliberately do NOT route the file's bytes
 * through a Server Action (the way song audio still does below) — Vercel
 * caps every function request body at a hard, non-configurable 4.5MB
 * (https://vercel.com/docs/functions/limitations#request-body-size), and a
 * real phone photo routinely exceeds that. Instead, `createImageUploadTicket`
 * mints a short-lived Supabase Storage signed upload URL/token server-side
 * (this step still needs the server client, to run the "insert" RLS check
 * as the signed-in user), and the browser uploads the file straight to
 * Supabase Storage with it (`supabase.storage.from("photos").uploadToSignedUrl(...)`
 * from a Client Component, using the anon-key browser client) — bypassing
 * the Vercel function, and its size limit, entirely. Only the resulting
 * storage path (a short string) ever crosses back through a Server Action.
 */

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export async function uploadAudioFile(seniorId: string, file: File): Promise<string> {
  const supabase = await createClient();
  const path = `${seniorId}/${crypto.randomUUID()}-${safeFileName(file.name || "audio")}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("audio")
    .upload(path, buffer, { contentType: file.type || "audio/mpeg", upsert: false });
  if (error) throw new Error(`Failed to upload audio: ${error.message}`);
  return path;
}

/** Private buckets need a signed URL per request rather than a public one. */
export async function getSignedAudioUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("audio").createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export type ImageUploadTicket = { path: string; token: string };

/**
 * Mints a one-time signed upload slot in the `photos` bucket for this
 * senior, without touching the file itself — the caller (a Server Action)
 * hands `path`/`token` back to the browser, which uploads directly to
 * Supabase Storage with them. See the file-level note above for why.
 */
export async function createImageUploadTicket(seniorId: string, fileName: string): Promise<ImageUploadTicket> {
  const supabase = await createClient();
  const path = `${seniorId}/${crypto.randomUUID()}-${safeFileName(fileName || "photo")}`;
  const { data, error } = await supabase.storage.from("photos").createSignedUploadUrl(path);
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
