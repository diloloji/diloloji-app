/**
 * AutoSpeakToggle — Otomatik sesli okuma aç/kapa düğmesi.
 * localStorage (conjume-speech-settings) üzerinden saklar, aynı window'daki
 * diğer toggle'lara "conjume:speech-settings" CustomEvent ile senkronize çalışır.
 */

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  getSpeechSettings,
  setSpeechSettings,
  subscribeSpeechSettings,
  ttsSupported,
} from '../../utils/speech';

interface AutoSpeakToggleProps {
  /** "pill" (varsayılan, label'lı) veya "icon" (sadece ikon). */
  variant?: 'pill' | 'icon';
  className?: string;
}

export default function AutoSpeakToggle({
  variant = 'pill',
  className = '',
}: AutoSpeakToggleProps) {
  const [on, setOn] = useState<boolean>(() => getSpeechSettings().autoSpeak);

  useEffect(() => {
    return subscribeSpeechSettings((s) => setOn(s.autoSpeak));
  }, []);

  if (!ttsSupported) return null;

  const toggle = () => setSpeechSettings({ autoSpeak: !on });

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        title={on ? 'Sesli okumayı kapat' : 'Sesli okumayı aç'}
        className={
          'inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors ' +
          (on
            ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15'
            : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700/60') +
          ' ' +
          className
        }
      >
        {on ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ' +
        (on
          ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15'
          : 'border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70') +
        ' ' +
        className
      }
    >
      {on ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      {on ? 'Sesli okuma açık' : 'Sesli okuma kapalı'}
    </button>
  );
}
