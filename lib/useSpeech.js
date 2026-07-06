'use client';
import { useCallback, useRef, useState } from 'react';

// Thin wrapper around the Web Speech API's SpeechRecognition, shared by
// every voice-input entry point in the app so language/error handling only
// lives in one place.
export function useSpeech({ lang = 'hi-IN', onResult, onError } = {}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback((overrideLang) => {
    if (!supported) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = overrideLang || lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      setListening(false);
      onResult?.(e.results[0][0].transcript);
    };
    rec.onerror = (e) => {
      setListening(false);
      onError?.(e);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [supported, lang, onResult, onError]);

  return { supported, listening, start, stop };
}
