import type { VoicePreset } from "./types";
import type { IconName } from "@/components/Icon";

// Real distinct "AI voices" and real voice cloning both need a paid
// third-party provider (e.g. ElevenLabs) with its own API key — not
// something this app can do on its own. Until one is connected, every
// preset here plays back using the browser's own speech synthesis voices,
// differentiated by rate/pitch and (where the browser offers more than
// one voice) which voice from its list is used. This is a realistic,
// honestly-labeled stand-in — see the note on the Settings page.

export const VOICE_PRESETS: Record<VoicePreset, { label: string; icon: IconName; description: string }> = {
  default: {
    label: "Default",
    icon: "speaker",
    description: "Your browser's standard reading voice.",
  },
  warm: {
    label: "Warm & Calm",
    icon: "waves",
    description: "A slower, gentler-sounding voice.",
  },
  bright: {
    label: "Clear & Bright",
    icon: "sun",
    description: "A brighter, more energetic-sounding voice.",
  },
  custom: {
    label: "Custom voice",
    icon: "mic",
    description: "Modeled after a voice recording you upload.",
  },
};

export function pickVoiceForPreset(
  preset: VoicePreset,
  voices: SpeechSynthesisVoice[]
): { voice?: SpeechSynthesisVoice; rate: number; pitch: number } {
  const englishVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = englishVoices.length > 0 ? englishVoices : voices;

  switch (preset) {
    case "warm":
      return { voice: pool[1] ?? pool[0], rate: 0.85, pitch: 0.85 };
    case "bright":
      return { voice: pool[2] ?? pool[0], rate: 1.05, pitch: 1.15 };
    case "custom":
      return { voice: pool[3] ?? pool[0], rate: 0.92, pitch: 0.95 };
    default:
      return { voice: undefined, rate: 0.95, pitch: 1 };
  }
}
