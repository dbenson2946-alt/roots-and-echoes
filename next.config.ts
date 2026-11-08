import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
