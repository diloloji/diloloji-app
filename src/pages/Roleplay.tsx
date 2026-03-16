/**
 * Görev Simülatörü — İmmersif rol oynama ile konuşma pratiği.
 * AI Persona, ipucu kartları, glassmorphism balonlar, görev kartı durumu, yazıyor animasyonu.
 */

import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, Target, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Navbar from '../components/Navbar';
import { useXp } from '../contexts/XpContext';
import {
  sendRoleplayMessage,
  fetchConversationFeedback,
  generateScenario,
  type RoleplayMessage,
  type RoleplayLangCode,
  type ConversationFeedback,
} from '../services/roleplayGroq';
import {
  getIncompleteConversation,
  saveConversation,
  markConversationCompleted,
  getCompletedScenarioIds,
  getDynamicScenarios,
  saveDynamicScenarios,
  type StoredDynamicScenario,
} from '../utils/roleplayConversations';

export type ScenarioCategory = 'seyahat' | 'is' | 'sosyal' | 'alisveris';
export type ScenarioDifficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type Scenario = {
  id: string;
  language: string;
  langCode: RoleplayLangCode;
  role: string;
  roleLabel: string;
  characterName: string;
  title: string;
  missionGoal: string;
  icon: string;
  quickPhrases: string[];
  successCriteria: string[];
  difficulty: ScenarioDifficulty;
  category: ScenarioCategory;
  estimatedMinutes?: number;
  /** CSS gradient for scenario background (subtle theme) */
  backgroundGradient: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'barcelona-restaurant',
    language: 'İspanyolca',
    langCode: 'es',
    role: 'garson',
    roleLabel: 'Garson',
    characterName: 'Juan',
    title: "Barselona'da Restoran",
    missionGoal:
      'Yerel bir restorandasın. Garsona sipariş verirken menüde glutensiz (sin gluten) seçenekler olup olmadığını ve mutfaktaki hazırlık sürecini net bir şekilde sor.',
    icon: '🍽️',
    quickPhrases: ['Sin gluten', 'La cuenta, por favor', 'Soy celíaco', '¿Tienen opciones vegetarianas?'],
    successCriteria: ['Glutensiz seçenek sor', 'En az bir yemek/içecek sipariş et', 'Hesabı iste'],
    difficulty: 'A2',
    category: 'seyahat',
    estimatedMinutes: 5,
    backgroundGradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(180,83,9,0.12) 0%, transparent 50%)',
  },
  {
    id: 'paris-bakery',
    language: 'Fransızca',
    langCode: 'fr',
    role: 'fırıncı (boulanger)',
    roleLabel: 'Boulanger',
    characterName: 'Pierre',
    title: "Paris'te Boulangerie",
    missionGoal: 'Sabah kahvaltısı için iki kruvasan ve bir kahve sipariş et.',
    icon: '🥐',
    quickPhrases: ['Deux croissants, s\'il vous plaît', 'Un café', 'À emporter', 'C\'est pour combien ?'],
    successCriteria: ['Kruvasan sipariş et', 'Kahve sipariş et', 'Ödeme/hesap ile bitir'],
    difficulty: 'A1',
    category: 'seyahat',
    estimatedMinutes: 4,
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

const LANG_OPTIONS: { value: RoleplayLangCode | 'all'; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'es', label: '🇪🇸 İspanyolca' },
  { value: 'fr', label: '🇫🇷 Fransızca' },
  { value: 'en', label: '🇬🇧 İngilizce' },
];
const DIFFICULTY_OPTIONS: { value: ScenarioDifficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
];
const CATEGORY_OPTIONS: { value: ScenarioCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'seyahat', label: 'Seyahat' },
  { value: 'is', label: 'İş' },
  { value: 'sosyal', label: 'Sosyal' },
  { value: 'alisveris', label: 'Alışveriş' },
];

export default function Roleplay() {
  const { addXP } = useXp();
  const [viewMode, setViewMode] = useState<'list' | 'chat'>('list');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedbackScreen, setShowFeedbackScreen] = useState(false);
  const [criteriaMet, setCriteriaMet] = useState<boolean[]>([]);
  const [hasIncomplete, setHasIncomplete] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [filterLang, setFilterLang] = useState<RoleplayLangCode | 'all'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<ScenarioDifficulty | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ScenarioCategory | 'all'>('all');
  const [dynamicScenarios, setDynamicScenarios] = useState<Scenario[]>(() => {
    const stored = getDynamicScenarios();
    return stored as Scenario[];
  });
  const [scenarioGenerating, setScenarioGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateLang, setGenerateLang] = useState<RoleplayLangCode>('es');
  const [generateLevel, setGenerateLevel] = useState<ScenarioDifficulty>('A2');
  const [generateCategory, setGenerateCategory] = useState<ScenarioCategory>('seyahat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const completedIds = getCompletedScenarioIds();
  const allScenarios = [...SCENARIOS, ...dynamicScenarios];

  useEffect(() => {
    setCriteriaMet(selectedScenario.successCriteria.map(() => false));
    const incomplete = getIncompleteConversation(selectedScenario.id);
    setHasIncomplete(!!incomplete && (incomplete.messages?.length ?? 0) > 0);
  }, [selectedScenario.id]);

  useEffect(() => {
    if (messages.length > 0 && !showFeedbackScreen)
      saveConversation(selectedScenario.id, messages);
  }, [messages, selectedScenario.id, showFeedbackScreen]);

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
      nextMessages,
      { characterName: selectedScenario.characterName, langCode: selectedScenario.langCode }
    );

    setMessages((prev) => [...prev, { role: 'assistant', content }]);
    setLoading(false);

    if (taskComplete) {
      setMissionComplete(true);
      setCriteriaMet(selectedScenario.successCriteria.map(() => true));
      setHasIncomplete(false);
      markConversationCompleted(selectedScenario.id, [...nextMessages, { role: 'assistant', content }]);
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
    setFeedback(null);
    setShowFeedbackScreen(false);
    setViewMode('chat');
  };

  const filteredScenarios = allScenarios.filter((s) => {
    if (filterLang !== 'all' && s.langCode !== filterLang) return false;
    if (filterDifficulty !== 'all' && s.difficulty !== filterDifficulty) return false;
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    return true;
  });

  const handleGenerateScenario = async () => {
    setScenarioGenerating(true);
    const payload = await generateScenario(generateLang, generateLevel, generateCategory);
    setScenarioGenerating(false);
    setShowGenerateModal(false);
    if (!payload) return;
    const newScenario: Scenario = {
      id: `ai-${Date.now()}`,
      title: payload.title,
      characterName: payload.characterName,
      roleLabel: payload.roleLabel,
      role: payload.roleLabel,
      missionGoal: payload.task,
      language: generateLang === 'es' ? 'İspanyolca' : generateLang === 'fr' ? 'Fransızca' : 'İngilizce',
      langCode: generateLang,
      icon: '✨',
      quickPhrases: payload.quickPhrases,
      successCriteria: payload.successCriteria,
      difficulty: generateLevel,
      category: generateCategory,
      estimatedMinutes: 5,
      backgroundGradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 50%)',
    };
    const next = [...dynamicScenarios, newScenario];
    setDynamicScenarios(next);
    saveDynamicScenarios(next as StoredDynamicScenario[]);
    selectScenario(newScenario);
  };

  const handleCompleteAndShowFeedback = async () => {
    if (messages.length === 0 || feedbackLoading) return;
    setFeedbackLoading(true);
    const result = await fetchConversationFeedback(
      selectedScenario.langCode,
      selectedScenario.missionGoal,
      messages
    );
    setFeedbackLoading(false);
    if (result) {
      setFeedback(result);
      setShowFeedbackScreen(true);
      markConversationCompleted(selectedScenario.id, messages, result);
    }
    setHasIncomplete(false);
  };

  const restoreIncomplete = () => {
    const incomplete = getIncompleteConversation(selectedScenario.id);
    if (incomplete?.messages?.length) {
      setMessages(incomplete.messages);
      setHasIncomplete(false);
    }
  };

  const addHintToInput = (phrase: string) => {
    setInput((prev) => (prev ? `${prev} ${phrase}` : phrase));
  };

  const win = typeof window !== 'undefined' ? window : undefined;
  const SpeechRecognitionCtor = win && ((win as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ?? (win as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
  const canUseMic = !!SpeechRecognitionCtor;

  const toggleMic = () => {
    if (!canUseMic || loading) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    type SpeechRecResultEvent = { results: { [i: number]: { [j: number]: { transcript: string } } } };
    interface SpeechRecInstance {
      lang: string;
      continuous: boolean;
      onresult: (e: SpeechRecResultEvent) => void;
      onend: () => void;
      onerror: () => void;
      start: () => void;
      stop: () => void;
    }
    const Ctor = SpeechRecognitionCtor as new () => SpeechRecInstance;
    const rec = new Ctor();
    rec.lang = selectedScenario.langCode === 'es' ? 'es-ES' : selectedScenario.langCode === 'fr' ? 'fr-FR' : 'en-GB';
    rec.continuous = false;
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript;
      if (t) setInput((prev) => (prev ? `${prev} ${t}` : t));
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
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
        {viewMode === 'list' ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-slate-100 mb-1">Görev Simülatörü</h1>
              <p className="text-slate-400 text-sm">Senaryo seçip konuşma pratiği yap</p>
            </div>
            {/* Filtreler */}
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Dil</p>
                <div className="flex flex-wrap gap-2">
                  {LANG_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setFilterLang(o.value as RoleplayLangCode | 'all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterLang === o.value ? 'bg-amber-500/30 text-amber-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Zorluk</p>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setFilterDifficulty(o.value as ScenarioDifficulty | 'all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterDifficulty === o.value ? 'bg-amber-500/30 text-amber-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Kategori</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setFilterCategory(o.value as ScenarioCategory | 'all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterCategory === o.value ? 'bg-amber-500/30 text-amber-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Senaryo kartları */}
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredScenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectScenario(s)}
                  className="relative rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:border-amber-500/40 hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {completedIds.includes(s.id) && (
                    <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/30 text-emerald-300 text-sm" aria-hidden>✓</span>
                  )}
                  <span className="text-2xl" aria-hidden>{s.icon}</span>
                  <h3 className="mt-2 font-semibold text-slate-100">{s.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{s.characterName} · {s.roleLabel}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">{s.difficulty}</span>
                    {s.estimatedMinutes != null && (
                      <span className="text-xs text-slate-500">~{s.estimatedMinutes} dk</span>
                    )}
                  </div>
                </button>
              ))}
              {/* Yapay Zeka ile Senaryo Oluştur */}
              <button
                type="button"
                onClick={() => setShowGenerateModal(true)}
                disabled={scenarioGenerating}
                className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-left hover:border-amber-500/40 hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 flex flex-col items-center justify-center min-h-[120px] text-slate-400 disabled:opacity-50"
                aria-label="Yapay zeka ile senaryo oluştur"
              >
                <span className="text-2xl mb-2" aria-hidden>✨</span>
                <span className="text-sm font-medium">{scenarioGenerating ? 'Senaryo hazırlanıyor...' : 'Yapay Zeka ile Senaryo Oluştur'}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="self-start mb-3 text-sm text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 rounded px-2 py-1"
            >
              ← Senaryolar
            </button>
            {/* Senaryo seçici (chat içinde başka senaryoya geç) */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {allScenarios.map((s) => (
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
            <p className="text-slate-200 text-sm leading-snug mt-0.5">
              {selectedScenario.missionGoal}
            </p>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/80 mb-2">Görev hedefleri</p>
              <ul className="space-y-1.5">
                {selectedScenario.successCriteria.map((c, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-2 text-sm ${criteriaMet[i] ? 'text-emerald-300' : 'text-slate-400'}`}
                  >
                    <span className="shrink-0">{criteriaMet[i] ? '✓' : '○'}</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Chat alanı — Sol tarafta AI Persona + mesajlar */}
        <div className="flex-1 min-h-[300px] rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col overflow-hidden relative">
          {/* Sol: AI Persona (karakter kimliği) */}
          <div className="absolute left-0 top-0 bottom-0 w-28 sm:w-32 border-r border-white/10 flex flex-col items-center pt-5 pb-4 bg-white/[0.02] z-10">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/20 text-3xl sm:text-4xl" aria-hidden>
              {selectedScenario.icon}
            </div>
            <p className="mt-3 text-sm font-bold text-slate-100 truncate w-full text-center px-1">
              {selectedScenario.characterName}
            </p>
            <p className="text-xs text-amber-400 font-medium truncate w-full text-center px-1">
              {selectedScenario.roleLabel}
            </p>
          </div>

          <div className="flex-1 flex flex-col pl-28 sm:pl-32">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  {hasIncomplete ? (
                    <div className="space-y-3">
                      <p className="text-slate-500 text-sm">Bu senaryoda yarım kalan bir konuşman var.</p>
                      <button
                        type="button"
                        onClick={restoreIncomplete}
                        className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        Kaldığın Yerden Devam Et
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">
                      İlk mesajını yaz veya aşağıdaki ipuçlarından birini seçerek senaryodaki karakterle konuşmaya başla.
                    </p>
                  )}
                </div>
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

            {/* Görevi Tamamla butonu — mesaj varken göster */}
            {messages.length > 0 && !showFeedbackScreen && (
              <div className="px-3 py-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCompleteAndShowFeedback}
                  disabled={feedbackLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-white/10 border border-white/20 text-slate-200 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                >
                  {feedbackLoading ? 'Analiz ediliyor...' : 'Görevi Tamamla ve Geri Bildirim Al'}
                </button>
              </div>
            )}

            {/* Input + Mikrofon + Gönder */}
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
              {canUseMic && (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={loading}
                  aria-label={isListening ? 'Dinlemeyi durdur' : 'Mikrofonla konuş'}
                  className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isListening
                      ? 'bg-red-500/30 border-red-500/50 text-red-300'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-slate-100'
                  }`}
                >
                  <Mic className="w-5 h-5" strokeWidth={2} />
                </button>
              )}
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
          {showCelebration && !showFeedbackScreen && (
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

        {/* Geri bildirim ekranı */}
        <AnimatePresence>
          {showFeedbackScreen && feedback && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
              role="dialog"
              aria-labelledby="feedback-title"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-white/10">
                  <h2 id="feedback-title" className="text-lg font-bold text-slate-100">
                    Konuşma Geri Bildirimi
                  </h2>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-3xl font-bold text-amber-400">{feedback.score}</span>
                    <span className="text-slate-400">/ 100</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                      Tahmini seviye: {feedback.levelEstimate}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{feedback.encouragement}</p>
                </div>
                <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
                  {feedback.grammarErrors.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-2">
                        Dilbilgisi düzeltmeleri
                      </h3>
                      <ul className="space-y-2">
                        {feedback.grammarErrors.map((e, i) => (
                          <li key={i} className="rounded-lg bg-white/5 p-3 text-sm">
                            <span className="text-red-300 line-through">{e.original}</span>
                            <span className="text-slate-300"> → </span>
                            <span className="text-emerald-300">{e.corrected}</span>
                            <p className="text-slate-400 text-xs mt-1">{e.explanation}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {feedback.vocabularyUsed.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-2">
                        Kullandığın kelimeler
                      </h3>
                      <p className="text-slate-300 text-sm">{feedback.vocabularyUsed.join(', ')}</p>
                    </div>
                  )}
                  {feedback.missedOpportunities.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-2">
                        Kullanabilirdin
                      </h3>
                      <ul className="text-slate-400 text-sm list-disc list-inside">
                        {feedback.missedOpportunities.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackScreen(false)}
                    className="w-full py-3 rounded-xl font-semibold bg-amber-500/90 text-slate-900 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    Kapat
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Yapay Zeka Senaryo Oluşturma modal */}
        <AnimatePresence>
          {showGenerateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => !scenarioGenerating && setShowGenerateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-xl"
              >
                <h3 className="text-lg font-bold text-slate-100 mb-4">Yapay Zeka ile Senaryo Oluştur</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Dil</label>
                    <select
                      value={generateLang}
                      onChange={(e) => setGenerateLang(e.target.value as RoleplayLangCode)}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="es">İspanyolca</option>
                      <option value="fr">Fransızca</option>
                      <option value="en">İngilizce</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Zorluk</label>
                    <select
                      value={generateLevel}
                      onChange={(e) => setGenerateLevel(e.target.value as ScenarioDifficulty)}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="A1">A1</option>
                      <option value="A2">A2</option>
                      <option value="B1">B1</option>
                      <option value="B2">B2</option>
                      <option value="C1">C1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Kategori</label>
                    <select
                      value={generateCategory}
                      onChange={(e) => setGenerateCategory(e.target.value as ScenarioCategory)}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="seyahat">Seyahat</option>
                      <option value="is">İş</option>
                      <option value="sosyal">Sosyal</option>
                      <option value="alisveris">Alışveriş</option>
                    </select>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    disabled={scenarioGenerating}
                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-slate-300 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateScenario}
                    disabled={scenarioGenerating}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500/90 text-slate-900 font-semibold text-sm hover:bg-amber-400 disabled:opacity-50"
                  >
                    {scenarioGenerating ? 'Hazırlanıyor...' : 'Oluştur'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}
