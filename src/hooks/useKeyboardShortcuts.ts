/**
 * Ezber Makinesi klavye kısayolları:
 * Space/Enter → flip, → Biliyorum, ← Bilmiyorum, ↓ Tekrar Et, Esc → çıkış onayı
 */

import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts(options: {
  onFlip: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;
  onSkip: () => void;
  onExit: () => void;
  isFlipped: boolean;
  enabled: boolean;
}) {
  const {
    onFlip,
    onCorrect,
    onIncorrect,
    onSkip,
    onExit,
    isFlipped,
    enabled,
  } = options;

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onFlip();
        return;
      }
      if (!isFlipped) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onCorrect();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIncorrect();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onSkip();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    },
    [enabled, isFlipped, onFlip, onCorrect, onIncorrect, onSkip, onExit]
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
