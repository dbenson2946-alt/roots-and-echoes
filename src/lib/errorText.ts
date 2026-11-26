/** Shown when a button points at an older version of the app than the one now
 * running: the page was opened before an update. A reload fixes it. */
export const OUT_OF_DATE_PAGE_TEXT =
  "The app was just updated, and this page is out of date. Please reload the page (press Ctrl+F5, or pull the page down on a phone) and try again.";

/**
 * Text to show someone when something they did failed.
 *
 * On the live site, Next.js hides the real message of any error thrown by a
 * Server Action and replaces it with "Minified React error #441 ...". That is
 * useless on screen, so those are swapped for the plain fallback. Messages
 * thrown in the browser itself (for example "That picture is too large") are
 * ours and are kept as they are. "Server Action ... was not found on the
 * server" means the page is out of date (see OUT_OF_DATE_PAGE_TEXT).
 */
export function errorText(err: unknown, fallback: string): string {
  if (!(err instanceof Error) || !err.message) return fallback;
  if (/server action .* was not found|failed-to-find-server-action/i.test(err.message)) return OUT_OF_DATE_PAGE_TEXT;
  if (/minified react error|server components render|omitted in production/i.test(err.message)) return fallback;
  return err.message;
}
