/**
 * Deste Editörü — Quizlet tarzı hızlı kart ekleme modalı.
 * Tab ile ön/arka arasında geçiş, Enter ile yeni satır, glassmorphism UI.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GripVertical, BookOpen, Globe, AlignLeft } from 'lucide-react';
import type { Deck } from '../../types/deck';

interface CardRow {
  id: string;
  front: string;
  back: string;
  hint: string;
}

interface DeckEditorProps {
  initialDeck?: Deck | null;
  onSave: (data: {
    title: string;
    language: string;
    icon: string;
    description: string;
    pairs: { front: string; back: string; hint?: string }[];
  }) => void;
  onClose: () => void;
}

const LANG_OPTIONS = [
  { label: 'İspanyolca', icon: '🇪🇸' },
  { label: 'Fransızca', icon: '🇫🇷' },
  { label: 'İngilizce', icon: '🇬🇧' },
  { label: 'Almanca', icon: '🇩🇪' },
  { label: 'İtalyanca', icon: '🇮🇹' },
  { label: 'Portekizce', icon: '🇵🇹' },
  { label: 'Diğer', icon: '🌍' },
];

function newRow(): CardRow {
  return { id: Math.random().toString(36).slice(2), front: '', back: '', hint: '' };
}

export default function DeckEditor({ initialDeck, onSave, onClose }: DeckEditorProps) {
  const [title, setTitle] = useState(initialDeck?.title ?? '');
  const [language, setLanguage] = useState(initialDeck?.language ?? 'İspanyolca');
  const [description, setDescription] = useState(initialDeck?.description ?? '');
  const [rows, setRows] = useState<CardRow[]>(() => {
    if (initialDeck?.cards.length) {
      return initialDeck.cards.map((c) => ({
        id: c.id,
        front: c.front,
        back: c.back,
        hint: c.hint ?? '',
      }));
    }
    return [newRow(), newRow(), newRow()];
  });
  const [showHints, setShowHints] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLang = LANG_OPTIONS.find((l) => l.label === language) ?? LANG_OPTIONS[0];

  const updateRow = useCallback((id: string, field: keyof CardRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, newRow()]);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  // Tab ile ön/arka arasında geçiş (Quizlet davranışı)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowId: string, field: 'front' | 'back' | 'hint') => {
      if (e.key === 'Tab' && !e.shiftKey) {
        const idx = rows.findIndex((r) => r.id === rowId);
        if (field === 'front') {
          // ön → arka
          e.preventDefault();
          document.getElementById(`back-${rowId}`)?.focus();
        } else if (field === 'back') {
          if (showHints) {
            e.preventDefault();
            document.getElementById(`hint-${rowId}`)?.focus();
          } else if (idx === rows.length - 1) {
            // son satırda → yeni satır ekle
            e.preventDefault();
            addRow();
            setTimeout(() => {
              const allRows = document.querySelectorAll('[id^="front-"]');
              const last = allRows[allRows.length - 1] as HTMLElement;
              last?.focus();
            }, 50);
          }
        } else if (field === 'hint') {
          if (idx === rows.length - 1) {
            e.preventDefault();
            addRow();
          }
        }
      }
    },
    [rows, showHints, addRow],
  );

  const handleSave = () => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('Deste adı boş olamaz');
    const validPairs = rows.filter((r) => r.front.trim() && r.back.trim());
    if (validPairs.length < 1) errs.push('En az 1 kart gerekli');
    if (errs.length > 0) { setErrors(errs); return; }
    onSave({
      title: title.trim(),
      language,
      icon: selectedLang.icon,
      description: description.trim(),
      pairs: validPairs.map((r) => ({
        front: r.front.trim(),
        back: r.back.trim(),
        hint: r.hint.trim() || undefined,
      })),
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const validCount = rows.filter((r) => r.front.trim() && r.back.trim()).length;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-white/10 bg-night-900/95 shadow-2xl shadow-indigo-500/10"
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-xl">
                {selectedLang.icon}
              </div>
              <div>
                <h2 className="font-bold text-white">
                  {initialDeck ? 'Desteyi Düzenle' : 'Yeni Deste Oluştur'}
                </h2>
                <p className="text-xs text-slate-400">{validCount} kart hazır</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHints((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                  showHints
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                    : 'border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <AlignLeft size={12} />
                İpucu
              </button>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Meta alanları */}
          <div className="grid grid-cols-1 gap-3 border-b border-white/10 px-6 py-4 sm:grid-cols-3 shrink-0">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-400">Deste Adı *</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="örn. En Sık 100 Fiil"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Dil *</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-night-900 px-4 py-2.5 text-sm text-white focus:border-indigo-500/60 focus:outline-none"
              >
                {LANG_OPTIONS.map((l) => (
                  <option key={l.label} value={l.label}>
                    {l.icon} {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-400">Açıklama (opsiyonel)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bu deste ne içeriyor?"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* Kart listesi — başlık */}
          <div className="flex items-center justify-between px-6 py-3 shrink-0">
            <div className="grid text-xs font-medium text-slate-400"
              style={{ gridTemplateColumns: showHints ? '1fr 1fr 160px 32px' : '1fr 1fr 32px', gap: '8px', width: 'calc(100% - 24px)' }}
            >
              <span className="flex items-center gap-1"><BookOpen size={11} /> ÖN YÜZ</span>
              <span>ARKA YÜZ</span>
              {showHints && <span>İPUCU</span>}
            </div>
          </div>

          {/* Kart listesi */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-6 pb-2 space-y-2">
            {rows.map((row, idx) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="group flex items-center gap-2"
              >
                {/* Sıra numarası */}
                <span className="w-6 shrink-0 text-center text-xs text-slate-600 select-none">
                  {idx + 1}
                </span>

                {/* Sürükleme tutamağı */}
                <GripVertical size={14} className="shrink-0 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Ön yüz */}
                <input
                  id={`front-${row.id}`}
                  value={row.front}
                  onChange={(e) => updateRow(row.id, 'front', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, row.id, 'front')}
                  placeholder="Ön yüz"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none focus:bg-white/8 transition-colors"
                />

                {/* Arka yüz */}
                <input
                  id={`back-${row.id}`}
                  value={row.back}
                  onChange={(e) => updateRow(row.id, 'back', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, row.id, 'back')}
                  placeholder="Arka yüz"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none focus:bg-white/8 transition-colors"
                />

                {/* İpucu */}
                {showHints && (
                  <input
                    id={`hint-${row.id}`}
                    value={row.hint}
                    onChange={(e) => updateRow(row.id, 'hint', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, row.id, 'hint')}
                    placeholder="İpucu..."
                    className="w-36 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none transition-colors"
                  />
                )}

                {/* Sil */}
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}

            {/* + Kart Ekle */}
            <button
              onClick={addRow}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-sm text-slate-500 transition-all hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/5"
            >
              <Plus size={14} />
              Kart Ekle
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 shrink-0">
            <div className="flex flex-col gap-0.5">
              {errors.length > 0 && (
                <p className="text-xs text-red-400">{errors[0]}</p>
              )}
              <p className="text-xs text-slate-500">
                <kbd className="rounded border border-white/10 px-1 py-0.5 text-[10px]">Tab</kbd>{' '}
                ile ilerle •{' '}
                <kbd className="rounded border border-white/10 px-1 py-0.5 text-[10px]">Esc</kbd>{' '}
                kapat
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-400 transition-all hover:bg-white/5 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={validCount === 0 || !title.trim()}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Globe size={14} />
                {initialDeck ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
