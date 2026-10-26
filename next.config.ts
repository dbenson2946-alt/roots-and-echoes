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
      // Next.js defaults Server Action request bodies to 1MB. Song audio
      // and the custom voice sample still go through a Server Action (see
      // src/lib/storage.ts), so raise this — but note Vercel itself caps
      // every function request body at a hard, non-configurable 4.5MB
      // (https://vercel.com/docs/functions/limitations#request-body-size);
      // 4mb leaves headroom under that for multipart/form-data overhead.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
