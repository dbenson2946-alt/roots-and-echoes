"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

// Minimal ambient typing for the (non-standard, Chrome/Edge/Safari-prefixed)
// Web Speech API so this compiles without pulling in a whole @types package.
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * A large textarea with an optional microphone button that dictates using
 * the browser's built-in speech recognition. Falls back to a plain textarea
 * (keyboard-only) in browsers that don't support it — nothing is ever
 * required to be typed, but nothing breaks if voice isn't available either.
 */
export function VoiceTextField({
  name,
  id,
  label,
  placeholder,
  defaultValue = "",
  rows = 5,
  required = false,
}: {
  name: string;
  id: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef(defaultValue);

  useEffect(() => {
    // Browser capability can only be known after mount (SSR has no `window`),
    // so this genuinely needs an effect rather than a render-time check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!getSpeechRecognition());
  }, []);

  function toggleListening() {
    const SR = getSpeechRecognition();
    if (!SR) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    baseTextRef.current = value;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      const base = baseTextRef.current;
      const joiner = base && !base.endsWith(" ") ? " " : "";
      if (finalText) {
        baseTextRef.current = base + joiner + finalText;
        setValue(baseTextRef.current);
      } else {
        setValue(base + joiner + interimText);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xl font-bold">
          {label}
        </label>
        {supported && (
          <button
            type="button"
            onClick={toggleListening}
            className={`btn-lg !min-h-[3rem] !py-2 !px-4 text-lg ${
              listening ? "btn-primary" : "btn-secondary"
            }`}
            aria-pressed={listening}
          >
            <Icon name="mic" className="h-5 w-5" />
            {listening ? "Listening… tap to stop" : "Speak instead"}
          </button>
        )}
      </div>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          baseTextRef.current = e.target.value;
          setValue(e.target.value);
        }}
        className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl leading-relaxed focus-visible:outline-none"
      />
      {!supported && (
        <p className="mt-1 text-base text-[var(--color-text-muted)]">
          Voice typing isn&rsquo;t available in this browser — typing works great too.
        </p>
      )}
    </div>
  );
}
