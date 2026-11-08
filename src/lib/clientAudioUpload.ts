"use client";

import { createClient } from "@/lib/supabase/client";
import {
  requestAudioUploadTicket,
  requestVoiceSampleUploadTicket,
  type RequestAudioUploadTicketResult,
} from "@/app/actions";

/**
 * Uploads an audio file straight from the browser to Supabase Storage,
 * bypassing the Server Action / Vercel function body entirely — same
 * pattern as uploadImageDirect (clientImageUpload.ts); see the file-level
 * comment in src/lib/storage.ts for why. Only the file's name (to build a
 * storage path) ever crosses through a Server Action; the bytes go
 * directly to Supabase using a one-time signed upload token.
 *
 * Returns the storage path to submit back with the rest of the form.
 * Throws with a message safe to show the person on failure.
 */
async function uploadWithTicket(file: File, ticket: RequestAudioUploadTicketResult): Promise<string> {
  if (ticket.status === "error") {
    throw new Error(ticket.message);
  }
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("audio")
    .uploadToSignedUrl(ticket.ticket.path, ticket.ticket.token, file, {
      contentType: file.type || "audio/mpeg",
    });
  if (error) {
    throw new Error(`That audio didn't upload: ${error.message}`);
  }
  return ticket.ticket.path;
}

export async function uploadAudioDirect(file: File): Promise<string> {
  return uploadWithTicket(file, await requestAudioUploadTicket(file.name));
}

/**
 * Same as uploadAudioDirect, but for the Settings page's custom read-aloud
 * voice sample specifically. Mints its ticket via
 * requestVoiceSampleUploadTicket, which is gated to the account owner only
 * (session.isSelf) — matching submitCustomVoice's own restriction, so a
 * contribute-permission caregiver can't mint a valid upload ticket for a
 * change they're not allowed to make.
 */
export async function uploadVoiceSampleDirect(file: File): Promise<string> {
  return uploadWithTicket(file, await requestVoiceSampleUploadTicket(file.name));
}
