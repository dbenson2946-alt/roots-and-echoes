"use client";

import { useState } from "react";
import { useSpeechVoices } from "@/lib/useSpeechVoices";
import { pickVoiceForPreset } from "@/lib/voicePresets";
import { Icon } from "@/components/Icon";
import type { VoicePreset } from "@/lib/types";

const SAMPLE_SENTENCE = "This is what this voice sounds like when reading to you.";

export function VoicePreviewButton({ preset }: { preset: VoicePreset }) {
  const [playing, setPlaying] = useState(false);
  const { voices, supported } = useSpeechVoices();

  if (!supported) return null;

  function handleClick() {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(SAMPLE_SENTENCE);
    const { voice, rate, pitch } = pickVoiceForPreset(preset, voices);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn-lg btn-secondary !min-h-[2.75rem] !py-1.5 !px-3 text-base"
      aria-pressed={playing}
    >
      <Icon name={playing ? "stop" : "play"} className="h-4 w-4" />
      {playing ? "Stop" : "Hear a sample"}
    </button>
  );
}
