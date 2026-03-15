/**
 * Mobil swipe gesture: sola/sağa/aşağı.
 * Sağa → markCorrect, Sola → markIncorrect, Aşağı → flipCard (çevrilmemişse).
 */

import { useCallback, useRef, useState } from 'react';

const MIN_SWIPE_PX = 50;

export function useSwipe(handlers: {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onSwipeDown?: () => void;
  onFlip?: () => void;
  canFlip?: boolean;
}) {
  const start = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.targetTouches[0];
      if (!t) return;
      start.current = { x: t.clientX, y: t.clientY };
      setDrag(null);
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const t = e.targetTouches[0];
      if (!t) return;
      setDrag({
        x: t.clientX - start.current.x,
        y: t.clientY - start.current.y,
      });
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    const dx = drag?.x ?? 0;
    const dy = drag?.y ?? 0;
    setDrag(null);

    if (Math.abs(dx) >= MIN_SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) handlers.onSwipeRight?.();
      else handlers.onSwipeLeft?.();
      return;
    }
    if (dy >= MIN_SWIPE_PX && handlers.canFlip) {
      handlers.onFlip?.();
    }
  }, [drag, handlers]);

  return {
    drag,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
