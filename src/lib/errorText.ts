/**
 * Text to show someone when something they did failed.
 *
 * On the live site, Next.js hides the real message of any error thrown by a
 * Server Action and replaces it with "Minified React error #441 ...". That is
 * useless on screen, so those are swapped for the plain fallback. Messages
 * thrown in the browser itself (for example "That picture is too large") are
 * ours and are kept as they are.
 */
export function errorText(err: unknown, fallback: string): string {
  if (!(err instanceof Error) || !err.message) return fallback;
  if (/minified react error|server components render|omitted in production/i.test(err.message)) return fallback;
  return err.message;
}
