/**
 * MicButton — mikrofon ikonu; tıklayınca STT başlatır, sonucu callback'e iletir.
 *
 * - sttSupported=false → gri + disabled, tooltip "Tarayıcınız mikrofonu desteklemiyor".
 * - Dinleme sırasında kırmızı + pulse animasyon.
 * - maxAlternatives=3 varsayılan.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  startListening,
  sttSupported,
  type SpeechLang,
  type ListenResult,
  type ListenError,
} from '../../utils/speech';

type Status = 'idle' | 'listening' | 'error';

interface MicButtonProps {
  /** Tanıma tamamlanınca alternatif listesi ve ilk transcript ile çağrılır. */
  onResult: (result: ListenResult) => void;
  /** Tanıma hata verirse çağrılır. */
  onError?: (error: ListenError) => void;
  /** "Anlaşılamadı" mesajı için basit kanca; MicButton kendi mesajını göstermez. */
  lang?: SpeechLang;
  /** Boyut (px). Varsayılan 20. */
  size?: number;
  /** Ek class. */
  className?: string;
  /** Disable dışarıdan. */
  disabled?: boolean;
  title?: string;
}

export default function MicButton({
  onResult,
  onError,
  lang = 'es-ES',
  size = 20,
  className = '',
  disabled = false,
  title,
}: MicButtonProps) {
  const [status, setStatus] = useState<Status>('idle');
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopRef.current?.();
    };
  }, []);

  const handleClick = useCallback(() => {
    if (!sttSupported || disabled) return;
    if (status === 'listening') {
      stopRef.current?.();
      setStatus('idle');
      return;
    }
    const handle = startListening({
      lang,
      maxAlternatives: 3,
      onStart: () => setStatus('listening'),
      onEnd: () => {
        // state update olasılıkla zaten promise cevabında
      },
    });
    stopRef.current = handle.stop;
    handle.promise
      .then((res) => {
        stopRef.current = null;
        if (res.ok) {
          setStatus('idle');
          onResult(res.result);
        } else {
          setStatus('idle');
          onError?.(res.error);
        }
      })
      .catch(() => {
        stopRef.current = null;
        setStatus('idle');
      });
  }, [status, lang, disabled, onResult, onError]);

  const notSupported = !sttSupported;
  const isListening = status === 'listening';

  const tip = notSupported
    ? 'Tarayıcınız mikrofonu desteklemiyor'
    : title || (isListening ? 'Dinlemeyi durdur' : 'Mikrofon ile söyle');

  const dim = `${size}px`;
  const iconDim = size - 4;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={notSupported || disabled}
      aria-label={tip}
      title={tip}
      aria-pressed={isListening}
      className={
        'relative inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ' +
        (notSupported
          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed bg-transparent '
          : isListening
            ? 'text-white bg-red-500 hover:bg-red-600 shadow ring-2 ring-red-400/40 '
            : 'text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 ') +
        className
      }
      style={{ width: dim, height: dim, minWidth: dim, minHeight: dim, padding: 0 }}
    >
      {notSupported ? (
        <MicOff style={{ width: iconDim, height: iconDim }} strokeWidth={2} />
      ) : (
        <Mic style={{ width: iconDim, height: iconDim }} strokeWidth={2} />
      )}
      {isListening && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full animate-mic-pulse pointer-events-none"
        />
      )}
    </button>
  );
}
