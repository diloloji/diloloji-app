/**
 * Görev Simülatörü — İmmersif rol oynama ile konuşma pratiği.
 * AI Persona, ipucu kartları, glassmorphism balonlar, görev kartı durumu, yazıyor animasyonu.
 */

import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, Target, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Navbar from '../components/Navbar';
import { useXp } from '../contexts/XpContext';
import { sendRoleplayMessage, type RoleplayMessage } from '../services/roleplayGroq';

export type Scenario = {
  id: string;
  language: string;
  role: string;
  roleLabel: string;
  characterName: string;
  title: string;
  missionGoal: string;
  icon: string;
  quickPhrases: string[];
  /** CSS gradient for scenario background (subtle theme) */
  backgroundGradient: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'barcelona-restaurant',
    language: 'İspanyolca',
    role: 'garson',
    roleLabel: 'Garson',
    characterName: 'Juan',
    title: "Barselona'da Restoran",
    missionGoal:
      'Yerel bir restorandasın. Garsona sipariş verirken menüde glutensiz (sin gluten) seçenekler olup olmadığını ve mutfaktaki hazırlık sürecini net bir şekilde sor.',
    icon: '🍽️',
    quickPhrases: ['Sin gluten', 'La cuenta, por favor', 'Soy celíaco', '¿Tienen opciones vegetarianas?'],
    backgroundGradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(180,83,9,0.12) 0%, transparent 50%)',
  },
  {
    id: 'paris-bakery',
    language: 'Fransızca',
    role: 'fırıncı (boulanger)',
    roleLabel: 'Boulanger',
    characterName: 'Pierre',
    title: "Paris'te Boulangerie",
    missionGoal: 'Sabah kahvaltısı için iki kruvasan ve bir kahve sipariş et.',
    icon: '🥐',
    quickPhrases: ['Deux croissants, s\'il vous plaît', 'Un café', 'À emporter', 'C\'est pour combien ?'],
    backgroundGradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(71,85,105,0.12) 0%, transparent 50%)',
  },
];

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      <motion.span
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="inline-block w-1.5 h-1.5 rounded-full bg-current"
      />
      <motion.span
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        className="inline-block w-1.5 h-1.5 rounded-full bg-current"
      />
      <motion.span
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        className="inline-block w-1.5 h-1.5 rounded-full bg-current"
      />
    </span>
  );
}

export default function Roleplay() {
  const { addXP } = useXp();
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: RoleplayMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const nextMessages: RoleplayMessage[] = [...messages, userMsg];
    const { content, taskComplete } = await sendRoleplayMessage(
      selectedScenario.language,
      selectedScenario.role,
      selectedScenario.missionGoal,
      nextMessages
    );

    setMessages((prev) => [...prev, { role: 'assistant', content }]);
    setLoading(false);

    if (taskComplete) {
      setMissionComplete(true);
      addXP(100);
      setShowCelebration(true);
      const duration = 2500;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#34d399', '#f59e0b', '#6366f1'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#34d399', '#f59e0b', '#6366f1'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
      setTimeout(() => setShowCelebration(false), 4000);
    }
  };

  const selectScenario = (s: Scenario) => {
    setSelectedScenario(s);
    setMessages([]);
    setShowCelebration(false);
    setMissionComplete(false);
  };

  const addHintToInput = (phrase: string) => {
    setInput((prev) => (prev ? `${prev} ${phrase}` : phrase));
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col relative">
      <Helmet>
        <title>Görev Simülatörü | Diloloji</title>
        <meta
          name="description"
          content="Gerçek hayat senaryolarında AI ile konuşma pratiği. Restoran, boulangerie ve daha fazlası."
        />
      </Helmet>
      <Navbar />

      {/* Senaryoya göre hafif flulaştırılmış arka plan */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute inset-0 opacity-[0.12] blur-xl"
          style={{ background: selectedScenario.backgroundGradient }}
        />
      </div>

      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6 pb-8 relative z-0">
        {/* Senaryo seçici */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectScenario(s)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                selectedScenario.id === s.id
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <span aria-hidden>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>

        {/* Görev Kartı — Kompakt + Durum etiketi */}
        <motion.div
          layout
          initial={false}
          animate={{
            backgroundColor: missionComplete ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
            borderColor: missionComplete ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.1)',
          }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border backdrop-blur-xl p-4 mb-4 flex flex-wrap items-center gap-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Target className="w-4 h-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">Görev</p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  missionComplete
                    ? 'bg-emerald-500/25 text-emerald-300'
                    : 'bg-amber-500/25 text-amber-300'
                }`}
              >
                {missionComplete ? 'Başarıldı!' : 'Devam Ediyor...'}
              </span>
            </div>
            <p className="text-slate-200 text-sm leading-snug mt-0.5 line-clamp-2">
              {selectedScenario.missionGoal}
            </p>
          </div>
        </motion.div>

        {/* Chat alanı — Sol tarafta AI Persona + mesajlar */}
        <div className="flex-1 min-h-[300px] rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col overflow-hidden relative">
          {/* Sol: AI Persona (karakter kimliği) */}
          <div className="absolute left-0 top-0 bottom-0 w-28 sm:w-32 border-r border-white/10 flex flex-col items-center pt-5 pb-4 bg-white/[0.02] z-10">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/20">
              <UtensilsCrossed className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} aria-hidden />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-200 truncate w-full text-center px-1">
              {selectedScenario.characterName}
            </p>
            <p className="text-xs text-amber-400/90 font-medium truncate w-full text-center px-1">
              {selectedScenario.roleLabel}
            </p>
          </div>

          <div className="flex-1 flex flex-col pl-28 sm:pl-32">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-8">
                  İlk mesajını yaz veya aşağıdaki ipuçlarından birini seçerek senaryodaki karakterle konuşmaya başla.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-lg ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white backdrop-blur-md border border-white/20'
                        : 'rounded-bl-md bg-slate-800/90 text-slate-100 backdrop-blur-md border border-white/10'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start"
                  >
                    <div className="rounded-2xl rounded-bl-md bg-slate-800/90 backdrop-blur-md border border-white/10 px-4 py-2.5 text-sm text-slate-400 flex items-center gap-1">
                      <span>{selectedScenario.characterName} cevap veriyor</span>
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* İpucu kartları — input'un hemen üstü */}
            <div className="px-3 pt-2 pb-1 border-t border-white/5">
              <p className="text-xs text-slate-500 mb-2 font-medium">Hızlı ifadeler</p>
              <div className="flex flex-wrap gap-2">
                {selectedScenario.quickPhrases.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => addHintToInput(phrase)}
                    disabled={loading}
                    className="shrink-0 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:border-amber-500/30 hover:text-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>

            {/* Input + Gönder */}
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`${selectedScenario.language} yaz...`}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/90 text-slate-900 px-5 py-3 font-semibold hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
                Gönder
              </button>
            </div>
          </div>
        </div>

        {/* Kutlama overlay */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              role="alert"
              aria-live="polite"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="rounded-2xl bg-gradient-to-br from-emerald-500/95 to-emerald-600 px-6 py-5 shadow-2xl shadow-emerald-500/30 text-center"
              >
                <p className="text-4xl mb-2" aria-hidden>
                  🎉
                </p>
                <p className="text-lg font-bold text-slate-900">Görev Başarıyla Tamamlandı!</p>
                <p className="text-slate-800 font-semibold">+100 XP</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
