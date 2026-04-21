/**
 * Alıştırma sırasında yanlış cevap verildiğinde açılan küçük bilgi kartı.
 * "Yazdığınız", "Doğrusu", ve kısa kural açıklaması (1 cümle) gösterir.
 * Mevcut koyu temayı bozmayacak şekilde kırmızı tonları ile yumuşak vurgulanır.
 */

import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export type ErrorAnalysisCardProps = {
  userAnswer: string;
  correctAnswer: string;
  rule: string;
  compact?: boolean;
  className?: string;
};

export default function ErrorAnalysisCard({
  userAnswer,
  correctAnswer,
  rule,
  compact = false,
  className = '',
}: ErrorAnalysisCardProps) {
  const displayUser = userAnswer.trim() === '' ? '(boş)' : userAnswer.trim();
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      role="note"
      aria-live="polite"
      className={`rounded-xl border border-red-400/40 dark:border-red-500/40 bg-red-50/80 dark:bg-red-500/10 backdrop-blur-sm shadow-sm ${
        compact ? 'px-3 py-2.5 text-xs' : 'px-4 py-3 text-sm'
      } ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          className={`shrink-0 text-red-500 dark:text-red-400 ${compact ? 'w-3.5 h-3.5 mt-0.5' : 'w-4 h-4 mt-0.5'}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-red-700 dark:text-red-300">
              Yazdığın:{' '}
              <span className="font-semibold line-through decoration-red-500/60">{displayUser}</span>
            </span>
            <span className="text-emerald-700 dark:text-emerald-300">
              Doğrusu:{' '}
              <span className="font-semibold">{correctAnswer}</span>
            </span>
          </div>
          <p className="mt-1.5 text-slate-700 dark:text-slate-300 leading-snug">
            <span className="font-medium text-amber-700 dark:text-amber-300">Kural:</span>{' '}
            {rule}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
