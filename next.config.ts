import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
