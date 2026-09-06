"use client";

import { createContext, useContext } from "react";
import type { VoicePreset, CustomVoice } from "@/lib/types";

export interface VoiceSettings {
  preset: VoicePreset;
  customVoice?: CustomVoice;
}

const VoiceContext = createContext<VoiceSettings>({ preset: "default" });

/** Makes the active senior's read-aloud voice choice available anywhere in
 * the tree — without threading it through every page that renders a
 * ReadAloudButton — by fetching it once in the root layout (a server
 * component) and providing it from here. */
export function VoiceProvider({
  settings,
  children,
}: {
  settings: VoiceSettings;
  children: React.ReactNode;
}) {
  return <VoiceContext.Provider value={settings}>{children}</VoiceContext.Provider>;
}

export function useVoiceSettings() {
  return useContext(VoiceContext);
}
