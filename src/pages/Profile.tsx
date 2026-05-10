/**
 * Profil / İstatistik — XP, Seviye, Seri özeti + GitHub tarzı aktivite ısı haritası.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Brain, Star, Flame, User } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useXp } from '../contexts/XpContext';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchActivityLog } from '../lib/userProgressDb';
import {
  LEVEL_ENTRY_XP,
  LEVEL_JOURNEY_EMOJIS,
  LEVEL_JOURNEY_TITLES,
  MAX_LEVEL,
  getLevel,
  getXPProgress,
} from '../utils/xpLevel';

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

function LevelJourneySection({ totalXP }: { totalXP: number }) {
  const userLevel = getLevel(totalXP);
  const xpProgress = getXPProgress(totalXP);
  const pctRounded = Math.round(xpProgress.percent);
  const activeRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      activeRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [userLevel, totalXP]);

  return (
    <section aria-labelledby="level-journey-heading" className="mt-12">
      <h2 id="level-journey-heading" className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
        <span aria-hidden>⚡</span> Seviye yolculuğu
      </h2>
      <div className="space-y-2">
        {Array.from({ length: MAX_LEVEL }, (_, i) => {
          const n = i + 1;
          const threshold = LEVEL_ENTRY_XP[n - 1] ?? 0;
          const rowTitle = LEVEL_JOURNEY_TITLES[n - 1] ?? '';
          const emoji = LEVEL_JOURNEY_EMOJIS[n - 1] ?? '⭐';
          const isDone = userLevel > n;
          const isLocked = userLevel < n;

          const nextEntry = n < MAX_LEVEL ? (LEVEL_ENTRY_XP[n] ?? 0) : null;
          const xpToNext = nextEntry != null ? Math.max(0, nextEntry - totalXP) : 0;

          if (isDone) {
            return (
              <div
                key={n}
                className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2.5 sm:px-4"
              >
                <span className="text-lg shrink-0" aria-hidden>
                  ✅
                </span>
                <span className="text-base shrink-0" aria-hidden>
                  {emoji}
                </span>
                <p className="flex-1 min-w-0 text-sm font-semibold text-emerald-100/95">
                  Level {n} · {rowTitle}
                </p>
                <span className="text-xs text-slate-400 tabular-nums shrink-0">
                  {threshold.toLocaleString('tr-TR')} XP
                </span>
                <span className="text-emerald-400 text-sm shrink-0" aria-hidden title="Tamamlandı">
                  ✓
                </span>
              </div>
            );
          }

          if (isLocked) {
            return (
              <div
                key={n}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 sm:px-4 opacity-65"
              >
                <span className="text-lg text-slate-500 shrink-0" aria-hidden>
                  🔒
                </span>
                <span className="text-base grayscale shrink-0 opacity-80" aria-hidden>
                  {emoji}
                </span>
                <p className="flex-1 min-w-0 text-sm font-semibold text-slate-500">
                  Level {n} · {rowTitle}
                </p>
                <span className="text-xs text-slate-500 tabular-nums shrink-0">
                  {threshold.toLocaleString('tr-TR')} XP
                </span>
                <span className="text-slate-500 text-sm shrink-0" aria-hidden>
                  🔒
                </span>
              </div>
            );
          }

          /* Aktif */
          return (
            <div
              key={n}
              ref={activeRowRef}
              className="rounded-xl border-2 border-violet-500/45 border-l-[4px] border-l-violet-400 bg-gradient-to-br from-violet-600/20 via-indigo-600/12 to-slate-900/35 px-3 py-3 sm:px-4 sm:py-4 ring-1 ring-violet-500/20 shadow-lg shadow-violet-950/20"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl shrink-0" aria-hidden>
                  {emoji}
                </span>
                <p className="text-sm sm:text-base font-bold text-violet-100 flex-1 min-w-0">
                  Level {n} · {rowTitle}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200 bg-violet-500/25 border border-violet-400/35 rounded-md px-2 py-0.5 shrink-0">
                  Mevcut
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-500"
                    style={{ width: `${pctRounded}%` }}
                  />
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 tabular-nums">
                  {xpProgress.xpNeededForNext > 0 ? (
                    <>
                      {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNext} XP · %{pctRounded}
                    </>
                  ) : (
                    <>El Maestro · {xpProgress.xpInCurrentLevel.toLocaleString('tr-TR')} XP (zirve)</>
                  )}
                </p>
                {n < MAX_LEVEL && (
                  <p className="text-[11px] text-violet-200/90">
                    Sonraki level için {xpToNext.toLocaleString('tr-TR')} XP daha
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const { totalXP, level, title, streak, activityHistory: ctxActivity } = useXp();
  const [logXpByDay, setLogXpByDay] = useState<Record<string, number>>({});
  const [hoverCell, setHoverCell] = useState<{ dateStr: string; xp: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLogXpByDay({});
      return;
    }
    void fetchActivityLog(user.id).then(setLogXpByDay);
  }, [user?.id]);

  const activityHistory = useMemo(() => {
    const out = { ...ctxActivity };
    for (const [k, v] of Object.entries(logXpByDay)) {
      if (typeof v === 'number' && v >= 0) out[k] = Math.max(out[k] ?? 0, v);
    }
    return out;
  }, [ctxActivity, logXpByDay]);

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

  if (isSupabaseConfigured && !authLoading && !user) {
    return <Navigate to="/" replace />;
  }

  if (isSupabaseConfigured && authLoading) {
    return (
      <div className="min-h-[100dvh] min-h-screen overflow-x-hidden bg-[#0a0e17] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center text-slate-500 text-sm">Yükleniyor…</main>
      </div>
    );
  }

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
            <p className="text-xs text-slate-500 mt-1 truncate">{title}</p>
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

        <LevelJourneySection totalXP={totalXP} />
      </main>
    </div>
  );
}
