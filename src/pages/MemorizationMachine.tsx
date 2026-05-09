/**
 * Ezber Makinesi — Quizlet + Anki + Memrise hibrit SRS sistemi.
 * Dashboard: Destelerim / Topluluk sekmeleri + 3-nokta menü + deste editörü.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, BookOpen, Users, MoreHorizontal, Edit3, Copy,
  Share2, Trash2, Play, Sparkles, ChevronRight,
  BarChart2, Calendar, CheckCircle2, Clock,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import DeckEditor from '../components/srs/DeckEditor';
import StudyEngine from '../components/srs/StudyEngine';
import { useDeckStore } from '../store/deckStore';
import type { Deck, Card } from '../types/deck';
import type { StudyMode } from '../types/studyMode';
import { STUDY_MODE_EMOJI, STUDY_MODE_I18N } from '../types/studyMode';

// ─── Tipler ──────────────────────────────────────────────────────────────

type Tab = 'mine' | 'community';
type View = 'dashboard' | 'study';

// ─── Deste Kartı ─────────────────────────────────────────────────────────

const STUDY_MODES_ORDER: StudyMode[] = ['cards', 'write', 'choice', 'match', 'speed'];

interface DeckCardProps {
  deck: Deck;
  dueCount: number;
  newCount: number;
  masteredCount: number;
  onStudy: (deck: Deck, mode: StudyMode) => void;
  onEdit?: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  onShare: () => void;
}

function DeckCard({
  deck, dueCount, newCount, masteredCount,
  onStudy, onEdit, onDuplicate, onDelete, onShare,
}: DeckCardProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyMode>('cards');
  const menuRef = useRef<HTMLDivElement>(null);
  const totalCards = deck.cards.length;
  const pct = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  // Menüyü dışarı tıklayınca kapat
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative flex flex-col rounded-2xl border border-white/10 bg-night-900/80 p-5 shadow-lg shadow-black/20 backdrop-blur-sm transition-all hover:border-indigo-500/30 hover:shadow-indigo-500/10"
    >
      {/* 3-nokta menü */}
      <div className="absolute right-3 top-3 z-10" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-slate-300"
        >
          <MoreHorizontal size={14} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              className="absolute right-0 top-8 z-20 min-w-[160px] rounded-xl border border-white/10 bg-night-900 py-1 shadow-2xl shadow-black/40"
            >
              {onEdit && !deck.isBuiltIn && (
                <MenuBtn icon={<Edit3 size={13} />} label={t('memorization.menuEdit')} onClick={() => { setMenuOpen(false); onEdit(); }} />
              )}
              <MenuBtn icon={<Copy size={13} />} label={t('memorization.menuCopy')} onClick={() => { setMenuOpen(false); onDuplicate(); }} />
              <MenuBtn icon={<Share2 size={13} />} label={t('memorization.menuShare')} onClick={() => { setMenuOpen(false); onShare(); }} />
              {onDelete && !deck.isBuiltIn && (
                <MenuBtn icon={<Trash2 size={13} />} label={t('memorization.menuDelete')} danger onClick={() => { setMenuOpen(false); onDelete(); }} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* İkon + başlık */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-2xl ring-1 ring-indigo-500/20">
          {deck.icon ?? '📚'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-bold text-white leading-tight">{deck.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{deck.language}</p>
        </div>
      </div>

      {/* Açıklama */}
      {deck.description && (
        <p className="mb-3 text-xs text-slate-500 line-clamp-2">{deck.description}</p>
      )}

      {/* İlerleme çubuğu */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-slate-600">
          <span>
            {t('memorization.dashboard.masteredLine', { mastered: masteredCount, total: totalCards })}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.35)]"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2 text-[10px]">
        <StatPill
          icon={<Calendar size={9} />}
          label={t('memorization.today')}
          value={dueCount}
          color="text-amber-400"
          accent="border-amber-500/30 bg-amber-500/5"
        />
        <StatPill
          icon={<Sparkles size={9} />}
          label={t('memorization.new')}
          value={newCount}
          color="text-sky-400"
          accent="border-sky-500/30 bg-sky-500/5"
        />
        <StatPill
          icon={<CheckCircle2 size={9} />}
          label={t('memorization.expert')}
          value={masteredCount}
          color="text-emerald-400"
          accent="border-emerald-500/30 bg-emerald-500/5"
        />
      </div>

      {/* Mod seç + Çalış + hızlı ikonlar */}
      <div className="mt-auto flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={studyMode}
            onChange={(e) => setStudyMode(e.target.value as StudyMode)}
            title={t('memorization.dashboard.studyModeTitle')}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-night-950/80 py-2.5 pl-3 pr-2 text-xs font-medium text-slate-200 focus:border-indigo-500/50 focus:outline-none"
          >
            {STUDY_MODES_ORDER.map((m) => (
              <option key={m} value={m}>
                {STUDY_MODE_EMOJI[m]} {t(STUDY_MODE_I18N[m].labelKey as 'memorization.studyMode.cards')}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onStudy(deck, studyMode)}
            disabled={totalCards === 0}
            className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
              dueCount > 0
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400'
                : 'border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Play size={14} />
            {t('memorization.study')}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1 rounded-xl border border-white/5 bg-white/[0.03] p-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-0.5 sm:p-1.5">
          {STUDY_MODES_ORDER.map((m) => (
            <button
              key={m}
              type="button"
              title={t(STUDY_MODE_I18N[m].labelKey as 'memorization.studyMode.cards')}
              onClick={() => onStudy(deck, m)}
              disabled={totalCards === 0}
              className="flex min-h-11 min-w-0 items-center justify-center rounded-lg p-2 text-xl leading-none text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 touch-manipulation sm:min-h-0 sm:text-lg"
            >
              <span aria-hidden>{STUDY_MODE_EMOJI[m]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Built-in rozet */}
      {deck.isBuiltIn && (
        <div className="absolute left-3 top-3">
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-400 ring-1 ring-amber-500/20">
            <Sparkles size={8} />
            {t('memorization.dashboard.builtInBadge')}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function StatPill({
  icon, label, value, color, accent = 'border-white/8 bg-white/4',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  accent?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${accent}`}>
      <span className={color}>{icon}</span>
      <span className="text-slate-500">{label}</span>
      <span className={`ml-auto font-bold ${color}`}>{value}</span>
    </div>
  );
}

function MenuBtn({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5 ${
        danger ? 'text-red-400 hover:text-red-300' : 'text-slate-400 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Boş durum ────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="col-span-full flex flex-col items-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 ring-2 ring-indigo-500/20">
        <BookOpen className="text-indigo-400" size={28} />
      </div>
      <h3 className="mb-2 text-lg font-bold text-white">{t('memorization.dashboard.emptyTitle')}</h3>
      <p className="mb-6 max-w-xs text-sm text-slate-500">
        {t('memorization.dashboard.emptySubtitle')}
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 transition-all active:scale-95"
      >
        <Plus size={15} />
        {t('memorization.dashboard.createFirstDeck')}
      </button>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────

export default function MemorizationMachine() {
  const { t } = useTranslation();
  const {
    userDecks, communityDecks,
    createDeck, updateDeck, deleteDeck, duplicateDeck, updateCards,
    getDueCount, getNewCount, getMasteredCount,
  } = useDeckStore();

  const [view, setView] = useState<View>('dashboard');
  const [activeTab, setActiveTab] = useState<Tab>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [studyingDeck, setStudyingDeck] = useState<Deck | null>(null);
  const [studyingMode, setStudyingMode] = useState<StudyMode>('cards');
  const [studySessionKey, setStudySessionKey] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const decks = activeTab === 'mine' ? userDecks : communityDecks;
  const filtered = decks.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.language.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalDueToday = userDecks.reduce((sum, d) => sum + getDueCount(d), 0);

  // Çalışma moduna geç
  const startStudy = useCallback((deck: Deck, mode: StudyMode = 'cards') => {
    setStudyingDeck(deck);
    setStudyingMode(mode);
    setStudySessionKey((k) => k + 1);
    setView('study');
  }, []);

  // Çalışma bitişi
  const handleStudyExit = useCallback(
    (updatedCards: Card[]) => {
      if (studyingDeck) {
        // Topluluk destesini kopyaladıktan sonra güncelle
        const isUser = userDecks.some((d) => d.id === studyingDeck.id);
        if (isUser) {
          updateCards(studyingDeck.id, updatedCards);
        }
      }
      setView('dashboard');
      setStudyingDeck(null);
    },
    [studyingDeck, userDecks, updateCards],
  );

  // Paylaş
  const handleShare = useCallback((deck: Deck) => {
    const url = `${window.location.origin}/ezber-makinesi?deck=${deck.id}`;
    navigator.clipboard.writeText(url).then(() => showToast(t('memorization.dashboard.toastLinkCopied')));
  }, [showToast, t]);

  // Çalışma ekranı
  if (view === 'study' && studyingDeck) {
    return (
      <StudyEngine
        key={`${studyingDeck.id}-${studyingMode}-${studySessionKey}`}
        deck={studyingDeck}
        mode={studyingMode}
        onExit={handleStudyExit}
        onStudyAgain={() => setStudySessionKey((k) => k + 1)}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('memorization.dashboard.helmetTitle')}</title>
      </Helmet>

      <div className="min-h-screen bg-night-950">
        <Navbar />

        {/* Hero / Hoş Geldin Bandı */}
        <div className="border-b border-white/5 bg-gradient-to-br from-indigo-950/40 via-night-950 to-night-950 px-4 pb-6 pt-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {t('memorization.dashboard.heroTitle')}{' '}
                  <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    SRS
                  </span>
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  {t('memorization.dashboard.heroTagline')}
                </p>
              </div>

              {/* Günlük özet */}
              {totalDueToday > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3"
                >
                  <Clock className="text-amber-400" size={18} />
                  <div>
                    <p className="text-sm font-bold text-amber-300">
                      {t('memorization.dashboard.dailyWaiting', { count: totalDueToday })}
                    </p>
                    <p className="text-xs text-amber-400/70">{t('memorization.dashboard.dailyHint')}</p>
                  </div>
                  <ChevronRight className="text-amber-400/50" size={14} />
                </motion.div>
              )}

              {/* + Yeni Deste */}
              <button
                onClick={() => { setEditingDeck(null); setEditorOpen(true); }}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-400 active:scale-95"
              >
                <Plus size={16} />
                {t('memorization.newDeck')}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6">
          {/* Sekmeler + Arama */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Tab */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              {([
                { id: 'mine' as Tab, labelKey: 'memorization.tabs.mine' as const, icon: <BookOpen size={13} /> },
                { id: 'community' as Tab, labelKey: 'memorization.tabs.community' as const, icon: <Users size={13} /> },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {t(tab.labelKey)}
                  {tab.id === 'mine' && userDecks.length > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      activeTab === 'mine' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                    }`}>
                      {userDecks.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Arama */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('memorization.dashboard.searchPlaceholder')}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none sm:w-56"
              />
            </div>
          </div>

          {/* Deste Grid */}
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            layout
          >
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                activeTab === 'mine' ? (
                  <EmptyState onCreate={() => { setEditingDeck(null); setEditorOpen(true); }} />
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-500">
                    {t('memorization.dashboard.noResults')}
                  </div>
                )
              ) : (
                filtered.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    dueCount={getDueCount(deck)}
                    newCount={getNewCount(deck)}
                    masteredCount={getMasteredCount(deck)}
                    onStudy={(d, m) => startStudy(d, m)}
                    onEdit={
                      !deck.isBuiltIn
                        ? () => { setEditingDeck(deck); setEditorOpen(true); }
                        : undefined
                    }
                    onDuplicate={() => {
                      const copy = duplicateDeck(deck);
                      setActiveTab('mine');
                      showToast(t('memorization.dashboard.toastDuplicated', { title: copy.title }));
                    }}
                    onDelete={
                      !deck.isBuiltIn
                        ? () => setDeleteConfirm(deck.id)
                        : undefined
                    }
                    onShare={() => handleShare(deck)}
                  />
                ))
              )}
            </AnimatePresence>
          </motion.div>

          {/* İstatistik Özeti (Destelerim sekmesi) */}
          {activeTab === 'mine' && userDecks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-2xl border border-white/10 bg-night-900/60 p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <BarChart2 className="text-indigo-400" size={16} />
                <h2 className="font-bold text-white">{t('memorization.dashboard.statsTitle')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    labelKey: 'memorization.dashboard.statDecks' as const,
                    value: userDecks.length,
                    color: 'text-indigo-300',
                    icon: '📦',
                  },
                  {
                    labelKey: 'memorization.dashboard.statCards' as const,
                    value: userDecks.reduce((s, d) => s + d.cards.length, 0),
                    color: 'text-blue-300',
                    icon: '🃏',
                  },
                  {
                    labelKey: 'memorization.dashboard.statDue' as const,
                    value: totalDueToday,
                    color: 'text-amber-300',
                    icon: '⏰',
                  },
                  {
                    labelKey: 'memorization.dashboard.statMasteredSum' as const,
                    value: userDecks.reduce((s, d) => s + getMasteredCount(d), 0),
                    color: 'text-green-300',
                    icon: '⭐',
                  },
                ].map((s) => (
                  <div
                    key={s.labelKey}
                    className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/5 p-4"
                  >
                    <span className="text-lg">{s.icon}</span>
                    <span className={`text-2xl font-extrabold ${s.color}`}>{s.value}</span>
                    <span className="text-xs text-slate-500">{t(s.labelKey)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Silme Onay Modalı */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                className="w-full max-w-sm rounded-2xl border border-white/10 bg-night-900 p-6 shadow-2xl"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-2xl">
                  🗑️
                </div>
                <h3 className="mb-2 font-bold text-white">{t('memorization.dashboard.deleteDeckTitle')}</h3>
                <p className="mb-6 text-sm text-slate-400">
                  {t('memorization.dashboard.deleteDeckBody')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirm) {
                        deleteDeck(deleteConfirm);
                        setDeleteConfirm(null);
                        showToast(t('memorization.dashboard.toastDeckDeleted'));
                      }
                    }}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-400 transition-all active:scale-95"
                  >
                    {t('memorization.menuDelete')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-white/10 bg-night-800 px-5 py-3 text-sm font-semibold text-white shadow-2xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Deste Editörü Modal */}
      <AnimatePresence>
        {editorOpen && (
          <DeckEditor
            key={editingDeck?.id ?? 'new'}
            initialDeck={editingDeck}
            onClose={() => { setEditorOpen(false); setEditingDeck(null); }}
            onSave={(data) => {
              if (editingDeck) {
                updateDeck(editingDeck.id, {
                  ...data,
                  pairs: data.pairs,
                });
                showToast(t('memorization.dashboard.toastDeckUpdated'));
              } else {
                createDeck(data.title, data.language, data.icon, data.description, data.pairs);
                setActiveTab('mine');
                showToast(t('memorization.dashboard.toastDeckCreated'));
              }
              setEditorOpen(false);
              setEditingDeck(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
