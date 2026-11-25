/**
 * The "where to go after signing in" address carried in sign-in links.
 * Only a plain path inside this app is accepted ("/photos", "/talk?x=1").
 * Anything else — another website ("https://…"), a protocol-relative address
 * ("//evil.example"), a backslash trick ("/\evil.example"), or something with
 * control characters — falls back to the home page, so a crafted sign-in link
 * can never send someone to another site after they sign in.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  return value;
}
