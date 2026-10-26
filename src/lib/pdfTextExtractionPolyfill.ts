/**
 * pdf-parse (used for PDF lyrics extraction, §22) depends on pdfjs-dist,
 * which references the browser-only `DOMMatrix` global at module
 * evaluation time in some of its build variants. Which variant actually
 * gets loaded turns out to differ by runtime — a plain Node `require()`
 * picks the safe CJS build, but Vercel's own loader for a
 * `serverExternalPackages` module resolves the browser-conditioned build
 * instead (confirmed via the Vercel preview deployment's runtime logs:
 * "Failed to load external module pdf-parse-...: ReferenceError: DOMMatrix
 * is not defined", see §23) — throwing before pdf-parse's own code ever
 * runs, regardless of which Next.js feature triggered the load.
 *
 * Registering a real DOMMatrix implementation globally — already available
 * via @napi-rs/canvas, one of pdf-parse's own dependencies — sidesteps the
 * ambiguity entirely: whichever build variant ends up loaded, the global
 * it expects to find is already there. Confirmed directly (not assumed):
 * importing pdf-parse's own browser-conditioned build file manually, with
 * this polyfill applied first, no longer throws.
 *
 * Side-effect only — import this before anything that might load pdf-parse,
 * so the global is registered first.
 */
import { DOMMatrix } from "@napi-rs/canvas";

// Deliberately typed as `unknown` on both sides — @napi-rs/canvas's
// DOMMatrix doesn't structurally match lib.dom.d.ts's DOMMatrix type (it's
// missing some legacy methods we never use, e.g. `scaleNonUniform`), and
// this is only ever meant to satisfy pdf-parse's runtime `typeof
// DOMMatrix !== "undefined"`-style checks, not to be type-checked as a
// real DOM API.
const globalWithDOMMatrix = globalThis as Record<string, unknown>;

if (typeof globalWithDOMMatrix.DOMMatrix === "undefined") {
  globalWithDOMMatrix.DOMMatrix = DOMMatrix as unknown;
}
