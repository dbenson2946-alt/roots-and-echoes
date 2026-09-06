import type { Metadata, Viewport } from "next";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
// Display faces for the "Warm Keepsake" design system — see globals.css.
// Playfair Display is used for headings/wordmark; Fraunces (incl. italic)
// for the smaller italic accents (subtitles, captions).
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/900.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "./globals.css";
import { getTextSize, getResolvedSession } from "@/lib/session";
import { getProfile } from "@/lib/store";
import { VoiceProvider, type VoiceSettings } from "@/components/VoiceProvider";

export const metadata: Metadata = {
  title: "Roots & Echoes",
  description: "A daily companion for sharing and remembering your life story.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deliberately NOT capping maximumScale — many users need to pinch-zoom.
  themeColor: "#f3e9d6",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const textSize = await getTextSize();

  // The voice used for read-aloud belongs to the senior whose story is
  // being viewed (not to whichever browser/device is looking at it), so it
  // stays consistent for the senior and any caregiver helping them — unlike
  // text size above, which is a per-browser cookie preference.
  const session = await getResolvedSession();
  const activeSenior = session?.activeSeniorId ? await getProfile(session.activeSeniorId) : null;
  const voiceSettings: VoiceSettings = {
    preset: activeSenior?.voicePreference ?? "default",
    customVoice: activeSenior?.customVoice,
  };

  return (
    <html lang="en" data-text-size={textSize} className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        <VoiceProvider settings={voiceSettings}>{children}</VoiceProvider>
      </body>
    </html>
  );
}
