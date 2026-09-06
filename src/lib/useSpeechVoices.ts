"use client";

import { useEffect, useState } from "react";

/** Loads the browser's available speech-synthesis voices (they can arrive
 * asynchronously, hence the "voiceschanged" listener) and whether the Web
 * Speech API is supported at all. Shared by ReadAloudButton and the voice
 * preview button on Settings so both pick from the exact same voice list. */
export function useSpeechVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);

    function load() {
      setVoices(window.speechSynthesis.getVoices());
    }
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  return { voices, supported };
}
