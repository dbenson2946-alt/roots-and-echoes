"use client";

import { useState } from "react";
import { useSpeechVoices } from "@/lib/useSpeechVoices";
import { pickVoiceForPreset } from "@/lib/voicePresets";
import { useVoiceSettings } from "@/components/VoiceProvider";
import { Icon } from "@/components/Icon";

export function ReadAloudButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const { voices, supported } = useSpeechVoices();
  const { preset } = useVoiceSettings();

  if (!supported) return null;

  function handleClick() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const { voice, rate, pitch } = pickVoiceForPreset(preset, voices);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn-lg btn-secondary !min-h-[3rem] !py-2 !px-4 text-lg"
      aria-pressed={speaking}
    >
      <Icon name={speaking ? "stop" : "speaker"} className="h-5 w-5" />
      {speaking ? "Stop reading" : "Read aloud"}
    </button>
  );
}
