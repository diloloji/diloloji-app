/**
 * SmartHintBubble — Akıllı İpucu Sistemi'nin görsel gövdesi.
 *
 * Üç görsel mod:
 *   - 'rule'    : sarı arka plan, tek satır kural cümlesi.
 *   - 'letters' : ilk N harf yeşil, kalan harfler gri nokta.
 *   - 'reveal'  : tam doğru cevap yeşil + "3 denemede gösterildi" notu.
 *
 * Mevcut dark tema renkleriyle uyumlu, mobil uyumlu (text-xs/sm).
 */
import type { LetterMaskToken } from '../utils/hintEngine';

type Mode = 'rule' | 'letters' | 'reveal';

type Props = {
  mode: Mode;
  rule?: string;
  letters?: LetterMaskToken[];
  correct?: string;
  /** Liste modunda 6 sütun grid içine girer; sol etiket boşluğu için padding. */
  withLeftPadding?: boolean;
  /** Kompakt görünüm (yan yana hizalama için). */
  compact?: boolean;
};

export default function SmartHintBubble({ mode, rule, letters, correct, withLeftPadding, compact }: Props) {
  const wrap = `${withLeftPadding ? 'pl-[5.5rem]' : ''} ${compact ? 'mt-0' : 'mt-2'} w-full min-w-0`;

  if (mode === 'rule') {
    return (
      <div className={wrap}>
        <div className="w-full rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50/90 dark:bg-amber-500/10 px-3 py-2 text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-snug">
          <span className="font-semibold mr-1">İpucu:</span>{rule}
        </div>
      </div>
    );
  }

  if (mode === 'letters') {
    return (
      <div className={wrap}>
        <div className="w-full rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50/90 dark:bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200">
          <p className="text-[11px] sm:text-xs font-medium mb-1 opacity-80">Harf ipucu — sıradaki yanlışta cevap gösterilecek.</p>
          <p className="font-mono text-base sm:text-lg tracking-[0.18em] leading-none">
            {(letters ?? []).map((tok, i) => {
              if (tok.kind === 'space') return <span key={i}>&nbsp;</span>;
              if (tok.kind === 'shown') {
                return (
                  <span key={i} className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {tok.char}
                  </span>
                );
              }
              return (
                <span key={i} className="text-slate-400 dark:text-slate-500">
                  {tok.char}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <div className="w-full rounded-lg border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-500/10 px-3 py-2 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-snug">
        <span className="font-semibold mr-1">Doğru cevap:</span>
        <span className="font-mono">{correct}</span>
        <span className="ml-2 text-[10px] sm:text-[11px] opacity-70">3 denemede gösterildi — öncelikli tekrara alındı.</span>
      </div>
    </div>
  );
}
