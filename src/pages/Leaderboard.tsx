/**
 * Küresel Liderlik Tablosu — Altın Lig, sanal rakipler, kullanıcı vurgusu.
 */

import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Trophy, Medal } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useXp } from '../contexts/XpContext';
import { buildLeaderboardList, type LeaderboardEntry } from '../data/leaderboardMock';

function getRankStyle(rank: number): string {
  if (rank === 1) return 'bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.2)]';
  if (rank === 2) return 'bg-slate-400/15 border-slate-400/40 text-slate-200 shadow-[0_0_16px_rgba(148,163,184,0.25)]';
  if (rank === 3) return 'bg-amber-700/20 border-amber-700/50 text-amber-300 shadow-[0_0_16px_rgba(180,83,9,0.25)]';
  return 'bg-white/5 border-white/10 text-slate-300';
}

export default function Leaderboard() {
  const { totalXP } = useXp();
  const list = useMemo(() => buildLeaderboardList(totalXP), [totalXP]);

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <Helmet>
        <title>Liderlik Tablosu | Diloloji</title>
        <meta name="description" content="Altın Lig — Küresel sıralama ve rakiplerinle yarış." />
      </Helmet>
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 pb-16">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 mb-4">
            <Trophy className="w-6 h-6 text-amber-400" strokeWidth={2} aria-hidden />
            <span className="text-amber-200 font-bold text-lg">Altın Lig</span>
          </div>
          <p className="text-slate-500 text-sm">Bu haftanın sıralaması</p>
        </header>

        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
          <ul className="divide-y divide-white/5" role="list">
            {list.map((entry, index) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                rank={index + 1}
              />
            ))}
          </ul>
        </div>

        <p className="mt-6 text-center text-slate-500 text-sm">
          Ligin bitmesine <span className="text-amber-400/90 font-semibold">2 gün 14 saat</span> kaldı
        </p>
      </main>
    </div>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const rankStyle = getRankStyle(rank);
  const isPodium = rank <= 3;
  const isYou = entry.isCurrentUser;

  return (
    <li
      className={`flex items-center gap-4 px-4 py-3 border-l-4 transition-all ${
        isYou
          ? 'bg-indigo-500/15 border-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.15)] font-semibold'
          : `border-transparent ${rankStyle}`
      }`}
    >
      <span className="flex w-8 shrink-0 justify-center text-sm font-bold tabular-nums text-slate-400">
        {isPodium ? (
          <Medal
            className={`w-5 h-5 ${
              rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : 'text-amber-600'
            }`}
            strokeWidth={2}
            aria-label={`${rank}. sıra`}
          />
        ) : (
          rank
        )}
      </span>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-slate-200"
        aria-hidden
      >
        {entry.initials}
      </span>
      <span className={`flex-1 min-w-0 truncate ${isYou ? 'text-indigo-200' : 'text-slate-200'}`}>
        {entry.name}
        {isYou && (
          <span className="ml-2 text-xs font-medium text-indigo-400">(Sen)</span>
        )}
      </span>
      <span className="shrink-0 text-sm font-bold tabular-nums text-amber-400/90">
        {entry.xp} XP
      </span>
    </li>
  );
}
