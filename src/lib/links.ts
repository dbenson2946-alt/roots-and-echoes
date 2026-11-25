/**
 * Links a person can save on a song. Only https addresses on YouTube's own
 * hosts are accepted, so a saved link can never point somewhere unexpected.
 * Returns the cleaned-up address, or null if it isn't one.
 */
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export function cleanYoutubeUrl(raw: string | null | undefined): string | null {
  let value = (raw ?? "").trim();
  if (!value || value.length > 500) return null;
  // Allow a pasted address with the "https://" missing.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url.toString();
}

export const YOUTUBE_LINK_HELP = "That doesn't look like a YouTube link. It should start with https://www.youtube.com/ or https://youtu.be/.";
