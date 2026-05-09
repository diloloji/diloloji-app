/**
 * Profil / İstatistik — XP, Seviye, Seri özeti + GitHub tarzı aktivite ısı haritası.
 */

import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Brain, Star, Flame, User } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useXp } from '../contexts/XpContext';

const WEEKS = 26;
const DAY_NAMES = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

function getGridDates(): { dateStr: string; row: number; col: number; isFuture: boolean }[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setDate(now.getDate() - (WEEKS - 1) * 7);
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);

  const items: { dateStr: string; row: number; col: number; isFuture: boolean }[] = [];
  for (let col = 0; col < WEEKS; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setDate(start.getDate() + col * 7 + row);
      const isFuture = d > now;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      items.push({ dateStr: `${y}-${m}-${day}`, row, col, isFuture });
    }
  }
  return items;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const mi = parseInt(m!, 10) - 1;
  return `${d} ${months[mi]} ${y}`;
}

function getCellColor(xp: number, isFuture: boolean): string {
  if (isFuture || xp < 0) return 'bg-transparent';
  if (xp === 0) return 'bg-[#1a1f2e]';
  if (xp < 50) return 'bg-blue-900/50';
  if (xp < 150) return 'bg-blue-600';
  return 'bg-blue-400';
}

export default function Profile() {
  const { totalXP, level, streak, activityHistory } = useXp();
  const [hoverCell, setHoverCell] = useState<{ dateStr: string; xp: number; x: number; y: number } | null>(null);

  const gridByPos = useMemo(() => {
    const dates = getGridDates();
    const map = new Map<string, { dateStr: string; xp: number; isFuture: boolean }>();
    dates.forEach(({ dateStr, row, col, isFuture }) => {
      map.set(`${row}-${col}`, {
        dateStr,
        xp: isFuture ? -1 : (activityHistory[dateStr] ?? 0),
        isFuture,
      });
    });
    return map;
  }, [activityHistory]);

  return (
    <div className="min-h-[100dvh] min-h-screen overflow-x-hidden bg-[#0a0e17] flex flex-col">
      <Helmet>
        <title>Profil | Diloloji</title>
        <meta name="description" content="İstatistikleriniz ve aktivite ısı haritası." />
      </Helmet>
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full min-w-0 px-4 py-8 pb-24 md:pb-16">
        <header className="flex items-center gap-3 mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
            <User className="w-6 h-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Profil</h1>
            <p className="text-slate-500 text-sm">İstatistikler ve aktivite</p>
          </div>
        </header>

        {/* İstatistik kartları */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-10">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Brain className="w-4 h-4 text-amber-400/90" strokeWidth={2} />
              <span className="text-xs font-medium uppercase tracking-wider">Toplam XP</span>
            </div>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">{totalXP}</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Star className="w-4 h-4 text-amber-400/90" strokeWidth={2} />
              <span className="text-xs font-medium uppercase tracking-wider">Seviye</span>
            </div>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">Lvl {level}</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Flame className="w-4 h-4 text-amber-400/90" strokeWidth={2} />
              <span className="text-xs font-medium uppercase tracking-wider">Günlük seri</span>
            </div>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">{streak} gün</p>
          </div>
        </div>

        {/* Isı haritası */}
        <section aria-label="Aktivite ısı haritası">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">Aktivite (son 6 ay)</h2>
          <div className="flex gap-1 items-start">
            {/* Gün etiketleri */}
            <div className="flex flex-col gap-0.5 pt-2 pr-1 text-[10px] text-slate-500">
              {DAY_NAMES.map((name) => (
                <span key={name} className="h-3 flex items-center justify-end" style={{ height: 14 }}>
                  {name}
                </span>
              ))}
            </div>
            {/* Grid */}
            <div className="relative flex-1 overflow-x-auto overflow-y-hidden -mx-1 px-1 pb-1 snap-x touch-pan-x">
              <div className="inline-flex flex-col gap-0.5 snap-start" style={{ minWidth: WEEKS * 14 }}>
                {Array.from({ length: 7 }, (_, row) => (
                  <div key={row} className="flex gap-0.5">
                    {Array.from({ length: WEEKS }, (_, col) => {
                      const cell = gridByPos.get(`${row}-${col}`);
                      if (!cell) return <div key={`${row}-${col}`} className="w-3 h-3 rounded-sm bg-transparent shrink-0" />;
                      const { dateStr, xp, isFuture } = cell;
                      const color = getCellColor(xp, isFuture);
                      return (
                        <div
                          key={`${row}-${col}`}
                          className={`w-3 h-3 rounded-sm shrink-0 ${color} ${!isFuture ? 'hover:ring-2 hover:ring-blue-400/80 cursor-default' : ''} transition-all`}
                          onMouseEnter={(e) => {
                            if (isFuture) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoverCell({
                              dateStr,
                              xp: xp >= 0 ? xp : 0,
                              x: rect.left,
                              y: rect.top - 4,
                            });
                          }}
                          onMouseLeave={() => setHoverCell(null)}
                          role="img"
                          aria-label={isFuture ? '' : xp > 0 ? `${dateStr}: ${xp} XP` : `${dateStr}: Aktivite yok`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              {/* Tooltip */}
              {hoverCell && (
                <div
                  className="fixed z-50 rounded-lg border border-white/20 bg-slate-800/98 px-3 py-2 text-xs shadow-xl pointer-events-none"
                  style={{
                    left: hoverCell.x,
                    top: hoverCell.y,
                    transform: 'translateY(-100%)',
                  }}
                >
                  <p className="text-slate-200 font-medium">{formatDateLabel(hoverCell.dateStr)}</p>
                  <p className="text-slate-400">{hoverCell.xp > 0 ? `${hoverCell.xp} XP` : 'Aktivite yok'}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
            <span>Az</span>
            <span className="flex gap-0.5">
              <span className="w-3 h-3 rounded-sm bg-[#1a1f2e]" aria-hidden />
              <span className="w-3 h-3 rounded-sm bg-blue-900/50" aria-hidden />
              <span className="w-3 h-3 rounded-sm bg-blue-600" aria-hidden />
              <span className="w-3 h-3 rounded-sm bg-blue-400" aria-hidden />
            </span>
            <span>Çok</span>
          </div>
        </section>
      </main>
    </div>
  );
}
