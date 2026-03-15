/**
 * AI Hayatta Kalma Simülatörü — Rol oynama ile konuşma pratiği.
 * Senaryo seçimi, Görev Kartı, WhatsApp tarzı chat, Groq, [GÖREV_TAMAM] → XP + konfeti.
 */

import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import Navbar from '../components/Navbar';
import { useXp } from '../contexts/XpContext';
import { sendRoleplayMessage, type RoleplayMessage } from '../services/roleplayGroq';

export type Scenario = {
  id: string;
  language: string;
  role: string;
  title: string;
  missionGoal: string;
  icon: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'barcelona-restaurant',
    language: 'İspanyolca',
    role: 'garson',
    title: 'Barselona\'da Restoran',
    missionGoal: 'Yerel bir restorandasın. Garsona sipariş verirken menüde glutensiz (sin gluten) seçenekler olup olmadığını ve mutfaktaki hazırlık sürecini net bir şekilde sor.',
    icon: '🍽️',
  },
  {
    id: 'paris-bakery',
    language: 'Fransızca',
    role: 'fırıncı (boulanger)',
    title: 'Paris\'te Boulangerie',
    missionGoal: 'Sabah kahvaltısı için iki kruvasan ve bir kahve sipariş et.',
    icon: '🥐',
  },
];

export default function Roleplay() {
  const { addXP } = useXp();
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

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
      addXP(100);
      setShowCelebration(true);
      const duration = 2500;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#f59e0b', '#eab308', '#6366f1', '#10b981'],
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#f59e0b', '#eab308', '#6366f1', '#10b981'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
      setTimeout(() => setShowCelebration(false), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <Helmet>
        <title>Hayatta Kalma Simülatörü | Diloloji</title>
        <meta name="description" content="Gerçek hayat senaryolarında AI ile konuşma pratiği. Restoran, boulangerie ve daha fazlası." />
      </Helmet>
      <Navbar />

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6 pb-8">
        {/* Senaryo seçici */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedScenario(s);
                setMessages([]);
                setShowCelebration(false);
              }}
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

        {/* Görev Kartı — Glassmorphism */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Target className="w-5 h-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-1">
                Görev
              </p>
              <p className="text-slate-200 text-sm leading-relaxed">
                {selectedScenario.missionGoal}
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Dil: {selectedScenario.language} · Rol: {selectedScenario.role}
              </p>
            </div>
          </div>
        </div>

        {/* Chat alanı */}
        <div className="flex-1 min-h-[280px] rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">
                İlk mesajını yaz ve senaryodaki karakterle konuşmaya başla.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-indigo-500/80 text-white rounded-br-md'
                      : 'bg-slate-700/80 text-slate-100 rounded-bl-md'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-slate-700/80 px-4 py-2.5 text-sm text-slate-400">
                  ...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
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

        {/* Kutlama overlay */}
        {showCelebration && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            role="alert"
            aria-live="polite"
          >
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/95 to-amber-600 px-6 py-5 shadow-2xl shadow-amber-500/30 text-center animate-menu-in">
              <p className="text-4xl mb-2" aria-hidden>🎉</p>
              <p className="text-lg font-bold text-slate-900">Görev Başarıyla Tamamlandı!</p>
              <p className="text-slate-800 font-semibold">+100 XP</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
