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

export async function uploadPhotoFile(seniorId: string, file: File): Promise<string> {
  const supabase = await createClient();
  const path = `${seniorId}/${crypto.randomUUID()}-${safeFileName(file.name || "photo")}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("photos")
    .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) throw new Error(`Failed to upload photo: ${error.message}`);
  return path;
}

/** Private buckets need a signed URL per request rather than a public one. */
export async function getSignedPhotoUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("photos").createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
