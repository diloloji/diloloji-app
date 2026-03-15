/**
 * 3D flip animasyonlu kelime kartı.
 * Ön: yabancı dil kelimesi. Arka: Türkçe anlam + örnek cümle + telaffuz butonu.
 */

import { useRef } from 'react';
import PronunciationButton from '../PronunciationButton';
import type { Language } from '../PronunciationButton';

export interface FlashcardWord {
  id: string;
  front: string;
  back: string;
  example?: string;
  language: string;
}

const langToCode: Record<string, Language> = {
  Fransızca: 'fr-FR',
  İspanyolca: 'es-ES',
  İngilizce: 'en-US',
};

type Props = {
  word: FlashcardWord;
  isFlipped: boolean;
  onFlip: () => void;
  dragOffset?: { x: number; y: number } | null;
  className?: string;
};

export default function FlashCard({ word, isFlipped, onFlip, dragOffset, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const langCode = langToCode[word.language] ?? 'fr-FR';
  const dx = dragOffset?.x ?? 0;
  const dy = dragOffset?.y ?? 0;
  const showRight = dx > 20;
  const showLeft = dx < -20;

  return (
    <div
      ref={containerRef}
      className={`perspective-[1000px] w-full ${className}`}
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative w-full cursor-pointer select-none"
        style={{ aspectRatio: '4/3', maxHeight: '320px' }}
        onClick={() => !isFlipped && onFlip()}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!isFlipped) onFlip();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Kart çevrildi' : 'Cevabı görmek için kartı çevir'}
      >
        {/* Swipe overlay hints */}
        {!isFlipped && (showRight || showLeft) && (
          <div
            className="absolute inset-0 rounded-3xl flex items-center justify-center text-4xl font-bold pointer-events-none z-10 transition-opacity"
            aria-hidden
          >
            {showRight && (
              <span className="text-emerald-400/90 drop-shadow-lg">✓</span>
            )}
            {showLeft && (
              <span className="text-red-400/90 drop-shadow-lg">✗</span>
            )}
          </div>
        )}

        <div
          className="relative w-full h-full transition-transform duration-300 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped
              ? `rotateY(180deg) translateX(${dx}px) translateY(${dy}px)`
              : `rotateY(0deg) translateX(${dx}px) translateY(${dy}px)`,
          }}
        >
          {/* Ön yüz — yabancı dil kelimesi */}
          <div
            className="absolute inset-0 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center p-8 shadow-2xl"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
            }}
          >
            <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider mb-2">
              {word.language}
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-slate-100 text-center">
              {word.front}
            </p>
          </div>

          {/* Arka yüz — Türkçe anlam + örnek + telaffuz */}
          <div
            className="absolute inset-0 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center p-8 shadow-2xl"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider mb-2">
              Anlam
            </span>
            <p className="text-xl sm:text-2xl font-semibold text-slate-200 text-center mb-2">
              {word.back}
            </p>
            {word.example && (
              <p className="text-sm text-slate-400 italic text-center mb-4 max-w-full">
                {word.example}
              </p>
            )}
            <PronunciationButton word={word.front} lang={langCode} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
