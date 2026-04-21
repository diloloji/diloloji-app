/**
 * TenseCardOverlay — Zaman Kartlarını overlay olarak gösterir.
 *
 * İki mod:
 *   - mode: 'grid'   → 9 kartın grid görünümü. Kart seçilince 'detail' moda geçer.
 *   - mode: 'detail' → Tek kartın tam içeriği. Üstte "← Tüm kartlar" linki varsa geri döner.
 *
 * Tasarım kısıtı: position: absolute (fixed DEĞİL). Bu bileşen `relative` konumlu
 * bir parent'ın içinde render edilmelidir. Kapatma yolları:
 *   - Dışarı (backdrop) tıklama
 *   - Sağ üstteki kapatma butonu
 *   - Escape tuşu
 *
 * z-index: 60 — mevcut dropdown'ların üstünde, modal'ların altında kalır.
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { TenseCard } from '../../data/tenseCards';
import { getTenseCardById } from '../../data/tenseCards';
import TenseCardGrid from './TenseCardGrid';
import TenseCardView from './TenseCardView';

type OpenState =
  | { kind: 'grid'; highlightId?: string }
  | { kind: 'detail'; tenseId: string; fromGrid?: boolean };

type Props = {
  open: OpenState | null;
  onClose: () => void;
};

export default function TenseCardOverlay({ open, onClose }: Props) {
  /** Overlay içinde 'detail' ↔ 'grid' arası yerel geçiş. */
  const [localState, setLocalState] = useState<OpenState | null>(open);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalState(open);
  }, [open]);

  useEffect(() => {
    if (!localState) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [localState, onClose]);

  if (!localState) return null;

  const card: TenseCard | null =
    localState.kind === 'detail' ? getTenseCardById(localState.tenseId) : null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="absolute inset-0 z-[60] flex items-start sm:items-center justify-center px-3 sm:px-6 py-6 sm:py-10 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onMouseDown={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Zaman kartları"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 shadow-2xl p-4 sm:p-6 my-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Başlık satırı */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {localState.kind === 'detail' && card && (
              <button
                type="button"
                onClick={() => setLocalState({ kind: 'grid', highlightId: card.tenseId })}
                className="text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded px-1"
              >
                ← Tüm kartlar
              </button>
            )}
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
              {localState.kind === 'grid' ? 'Zaman Kartları' : card?.tense ?? 'Zaman Kartı'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gövde */}
        {localState.kind === 'grid' && (
          <TenseCardGrid
            highlightId={localState.highlightId}
            onSelect={(c) => setLocalState({ kind: 'detail', tenseId: c.tenseId, fromGrid: true })}
          />
        )}
        {localState.kind === 'detail' && card && <TenseCardView card={card} />}
        {localState.kind === 'detail' && !card && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">
            Bu zaman için kart bulunamadı.
          </p>
        )}
      </div>
    </div>
  );
}
