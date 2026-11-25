import type { NextConfig } from "next";

// ---- Security headers (pre-pilot review, finding 12) ----
// Sent with every page. The content-security rules below are only the ones that
// can be set without per-request nonces: nothing may frame the app, no plug-ins,
// forms only post back to the app, and pictures, audio and network requests may
// only come from the app itself and this project's own Supabase address. (A rule
// for scripts needs per-request nonces and is a separate, larger piece of work.)
// They are left off in development, where the dev server needs extra sources.
const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  } catch {
    return "";
  }
})();

const contentSecurityPolicy = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(supabaseOrigin
    ? [
        `img-src 'self' blob: data: ${supabaseOrigin}`,
        `media-src 'self' blob: data: ${supabaseOrigin}`,
        `connect-src 'self' ${supabaseOrigin}`,
      ]
    : []),
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The microphone is used by recording and dictation; nothing else is needed.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // pdf-parse (used by the lyrics-upload feature, §22) depends on pdfjs-dist,
  // which ships separate browser/Node builds keyed off package "exports"
  // conditions. Bundling it (the default) lets Turbopack's own module
  // resolution pick an entry point meant for the browser, whose top-level
  // code references `DOMMatrix` unconditionally — a browser-only global that
  // doesn't exist in the Node server runtime, crashing every page at module
  // evaluation (`ReferenceError: DOMMatrix is not defined`). Marking it
  // external makes Node's own `require()` resolve it instead, which picks
  // the correct Node-targeted build. Discovered after the Next.js 16.4.3
  // upgrade (§23) changed the default bundler to Turbopack; the same
  // mis-resolution risk already existed under webpack, it just never
  // actually triggered there.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  experimental: {
    serverActions: {
      // Next.js defaults Server Action request bodies to 1MB. Photo/art
      // images and every audio upload (song audio, memory/song recordings,
      // the custom voice sample) now bypass Server Actions entirely via the
      // signed-upload-ticket pattern (src/lib/storage.ts) — only the
      // lyrics-file upload (§22, up to MAX_LYRICS_UPLOAD_BYTES = 2MB in
      // src/lib/ui.ts) still sends a File's bytes through one
      // (extractLyricsFromFile). Raised past the 1MB default to leave
      // headroom for that file plus multipart/form-data overhead — well
      // under Vercel's own hard, non-configurable 4.5MB function
      // request-body cap
      // (https://vercel.com/docs/functions/limitations#request-body-size).
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
