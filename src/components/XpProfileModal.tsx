import { Link } from 'react-router-dom';
import { useXp } from '../contexts/XpContext';
import { getXpActivityHistory } from '../utils/xpLevel';
import { getLastNDays } from '../utils/activityHistory';

type Props = { open: boolean; onClose: () => void };

export default function XpProfileModal({ open, onClose }: Props) {
  const { totalXP, level, title, xpProgress, streak, lastActiveDate } = useXp();
  const history = getXpActivityHistory();
  const days = getLastNDays(14);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="xp-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <h2 id="xp-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
            İlerleme
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 dark:text-slate-400"
          >
            Kapat
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Seviye</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {level} — {title}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 tabular-nums">
              Toplam {totalXP.toLocaleString('tr-TR')} XP
            </p>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Sonraki seviye</span>
              <span className="tabular-nums">
                {xpProgress.xpForNextLevel != null
                  ? `${xpProgress.xpInCurrentLevel} / ${xpProgress.xpNeededForNext} XP`
                  : 'Maksimum seviye'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-all duration-500 ease-out"
                style={{ width: `${Math.round(xpProgress.percent)}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3 text-sm">
            <p className="font-medium text-slate-700 dark:text-slate-200">🔥 Günlük seri (XP)</p>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {streak} gün
              {lastActiveDate ? ` · Son: ${lastActiveDate}` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Son 14 gün (XP)</p>
            <div className="flex gap-1 flex-wrap">
              {days.map((d) => {
                const v = history[d] ?? 0;
                const h = v <= 0 ? 'h-6' : v < 50 ? 'h-8' : v < 150 ? 'h-10' : 'h-12';
                return (
                  <div
                    key={d}
                    title={`${d}: ${v} XP`}
                    className={`w-2 rounded-sm ${h} ${v > 0 ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                  />
                );
              })}
            </div>
          </div>
          <Link
            to="/profil"
            className="block text-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            onClick={onClose}
          >
            Tam profil sayfası →
          </Link>
        </div>
      </div>
    </div>
  );
}
