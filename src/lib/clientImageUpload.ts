"use client";

import { createClient } from "@/lib/supabase/client";
import { requestImageUploadTicket } from "@/app/actions";

/**
 * Uploads an image file straight from the browser to Supabase Storage,
 * bypassing the Server Action / Vercel function body entirely — see the
 * file-level comment in src/lib/storage.ts for why. Only the file's name
 * (to build a storage path) ever crosses through a Server Action; the
 * bytes go directly to Supabase using a one-time signed upload token.
 *
 * Returns the storage path to submit back with the rest of the form.
 * Throws with a message safe to show the person on failure.
 */
export async function uploadImageDirect(file: File): Promise<string> {
  const ticket = await requestImageUploadTicket(file.name);
  if (ticket.status === "error") {
    throw new Error(ticket.message);
  }
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("photos")
    .uploadToSignedUrl(ticket.ticket.path, ticket.ticket.token, file, {
      contentType: file.type || "image/jpeg",
    });
  if (error) {
    throw new Error(`The picture didn't upload: ${error.message}`);
  }
  return ticket.ticket.path;
}
