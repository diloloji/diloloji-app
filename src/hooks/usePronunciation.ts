/**
 * Web Speech API ile sesli telaffuz.
 * SSR uyumlu; Safari'de voices yüklemesi için onvoiceschanged desteği.
 */

import { useState, useCallback, useEffect } from 'react';

export type Language = 'fr-FR' | 'es-ES' | 'en-US' | 'tr-TR';

const RATE = 0.85;
const PITCH = 1;

function getVoicesSync(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: Language): SpeechSynthesisVoice | null {
  const langPrefix = lang.slice(0, 2);
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const pref = voices.find((v) => v.lang.startsWith(langPrefix));
  return pref ?? null;
}

export function usePronunciation(word: string, lang: Language) {
  const [isPlaying, setIsPlaying] = useState(false);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const speak = useCallback(() => {
    if (!word?.trim() || !isSupported) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(word.trim());
    utterance.lang = lang;
    utterance.rate = RATE;
    utterance.pitch = PITCH;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    const voices = getVoicesSync();
    if (voices.length > 0) {
      const voice = pickVoice(voices, lang);
      if (voice) utterance.voice = voice;
      synth.speak(utterance);
    } else {
      let didSpeak = false;
      const onVoicesChanged = () => {
        if (didSpeak) return;
        const v = getVoicesSync();
        if (v.length > 0) {
          didSpeak = true;
          const voice = pickVoice(v, lang);
          if (voice) utterance.voice = voice;
          synth.speak(utterance);
        }
      };
      synth.onvoiceschanged = onVoicesChanged;
      synth.getVoices();
      setTimeout(() => {
        if (didSpeak) return;
        if (getVoicesSync().length > 0) onVoicesChanged();
        else {
          didSpeak = true;
          synth.speak(utterance);
        }
      }, 100);
    }
  }, [word, lang, isSupported]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    };
  }, []);

  return { speak, isPlaying, isSupported };
}
