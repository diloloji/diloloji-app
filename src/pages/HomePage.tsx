import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, useInView } from 'framer-motion';
import { Cpu, Brain, Activity, BookA, FlaskConical, GraduationCap, Search, MessageCircle, Braces, Flame, Target, RefreshCcw, Sparkles, Zap, Newspaper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FloatingBackgroundElements from '../components/FloatingBackgroundElements';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SyntaxFlowHero from '../components/SyntaxFlowHero';
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { getDueMistakesByPriority, getMistakesByPriority } from '../utils/mistakeBank';
import { getDailyGoalSummary, DAILY_GOAL } from '../utils/dailyGoal';

const SITE_URL = 'https://diloloji.com';
const PARALLAX_INTENSITY = 14;

function BackgroundWithPattern({ mouseX = 0, mouseY = 0 }: { mouseX?: number; mouseY?: number }) {
  const tx = typeof window !== 'undefined' ? (mouseX / window.innerWidth - 0.5) * PARALLAX_INTENSITY : 0;
  const ty = typeof window !== 'undefined' ? (mouseY / window.innerHeight - 0.5) * PARALLAX_INTENSITY : 0;
  return (
    <>
      {/* Deeper night blue / black (dark landing) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0f1623] via-35% to-[#151d2e] to-[#1e293b] transition-colors duration-500 dark:from-[#0a0f1a] dark:via-[#0f1623] dark:via-40% dark:to-[#151d2e] dark:to-[#1e293b]"
        aria-hidden
      />
      {/* Subtle geometric accent line */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" aria-hidden>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(99,102,241)" />
              <stop offset="100%" stopColor="rgb(129,140,248)" />
            </linearGradient>
          </defs>
          <path d="M 0 40 Q 25% 20, 50% 40 T 100% 40" fill="none" stroke="url(#line-grad)" strokeWidth="0.5" />
          <path d="M 0 60 Q 50% 80, 100% 60" fill="none" stroke="url(#line-grad)" strokeWidth="0.5" />
        </svg>
      </div>
      {/* Light mode: softer gradient (covers dark gradient when not dark) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-200/80 dark:opacity-0 transition-opacity duration-500 opacity-100"
        aria-hidden
      />
      {/* Grid — mouse paralaks */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none select-none transition-transform duration-200 ease-out"
        style={{ transform: `translate(${tx}px, ${ty}px)` }}
        aria-hidden
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="landing-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#landing-grid)" className="text-white dark:text-white" />
        </svg>
      </div>
      <FloatingBackgroundElements />
    </>
  );
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Dilini seç',
    description: 'Fransızca veya İspanyolca ile başla. Fiil Laboratuvarı veya Ezber Makinesi’ni aç.',
    icon: BookA,
  },
  {
    step: '02',
    title: 'Çekimleri keşfet',
    description: 'Fiil gir, tüm zamanları gör. Mastar, ulaç ve örnek cümlelerle pratik yap.',
    icon: Activity,
  },
  {
    step: '03',
    title: 'Ezberle ve pekiştir',
    description: 'Quiz, zamana karşı ve kıyaslama modları ile kalıcı öğren.',
    icon: GraduationCap,
  },
];

const STATS = [
  { value: 10000, suffix: '+', label: 'Kelime Çekimi', icon: '📐' },
  { value: 500, suffix: '+', label: 'Aktif Kullanıcı', icon: '👥' },
  { value: 50000, suffix: '+', label: 'Dağıtılan XP', icon: '⭐' },
];

const SUPPORTED_LANGUAGES = [
  { name: 'Fransızca', flag: '🇫🇷', code: 'fr' },
  { name: 'İspanyolca', flag: '🇪🇸', code: 'es' },
  { name: 'Almanca', flag: '🇩🇪', code: 'de' },
  { name: 'İtalyanca', flag: '🇮🇹', code: 'it' },
];

const FEATURES = [
  {
    title: 'Algoritmik Öğrenme',
    description: 'Ezber yerine dilin kurallarını ve formüllerini keşfedin. Kalıpları görün, kalıcı öğrenin.',
    icon: Cpu,
  },
  {
    title: 'Hafıza Sarayı Tekniği',
    description: 'Zaman çizelgeleri ve yapısal tekrarla bilgiyi uzun süreli belleğe taşıyın.',
    icon: Brain,
  },
  {
    title: 'Gerçek Zamanlı Çekim Analizi',
    description: 'Fiil girin, anında tüm zamanları ve kişileri görün. Anlam ve telaffuz desteği.',
    icon: Activity,
  },
];

function StatRow({ stat, inView }: { stat: (typeof STATS)[number]; inView: boolean }) {
  const count = useCountUp(stat.value, inView, 1800);
  const display = stat.value >= 1000 ? count.toLocaleString('tr-TR') : String(count);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
      <span className="text-3xl sm:text-4xl" aria-hidden>{stat.icon}</span>
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {display}{stat.suffix}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{stat.label}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  feature: f,
  index,
  isAlgo,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  isAlgo: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group glass-panel-strong p-6 lg:p-8 text-center relative overflow-hidden"
    >
      {isAlgo && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-400"
          aria-hidden
        >
          <div className="flex items-baseline gap-1 font-mono text-base sm:text-lg">
            <span className="text-orange-500 dark:text-orange-400 font-bold drop-shadow-sm origin-left scale-95 group-hover:scale-100 transition-transform duration-500">
              parl
            </span>
            <span className="text-slate-300 dark:text-slate-600 text-lg self-center" style={{ width: 2 }}>|</span>
            <span className="text-indigo-500 dark:text-indigo-400 font-bold drop-shadow-sm origin-right scale-95 group-hover:scale-100 transition-transform duration-500">
              er
            </span>
          </div>
        </div>
      )}
      <div className="relative z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-4">
          <f.icon className="w-6 h-6" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
      </div>
    </motion.div>
  );
}

/** Count-up: 0 → target when in view, easeOutExpo */
function useCountUp(target: number, inView: boolean, durationMs = 1800) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) {
      setDisplay(0);
      startRef.current = null;
      return;
    }
    startRef.current = performance.now();
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number) => {
      const start = startRef.current ?? now;
      const elapsed = now - start;
      const t = Math.min(elapsed / durationMs, 1);
      setDisplay(Math.round(easeOutExpo(t) * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView, target, durationMs]);

  return display;
}

export default function HomePage() {
  const { t } = useTranslation();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });
  const socialProofRef = useRef<HTMLDivElement>(null);
  const socialProofInView = useInView(socialProofRef, { once: true, amount: 0.2 });
  const countUsers = useCountUp(500, socialProofInView, 1600);
  const countWords = useCountUp(1247, socialProofInView, 1800);

  const dueMistakes = useMemo(() => getDueMistakesByPriority(), []);
  const allMistakes = useMemo(() => getMistakesByPriority(), []);
  const goal = useMemo(() => getDailyGoalSummary(), []);
  const topMistakes = useMemo(
    () => allMistakes.filter((m) => m.mistakeCount > 1).slice(0, 3),
    [allMistakes]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      className="min-h-[100dvh] min-h-screen overflow-x-hidden relative bg-slate-100 dark:bg-transparent transition-colors duration-300"
      onMouseMove={handleMouseMove}
    >
      <Helmet>
        <title>Diloloji — Dilin Matematiği</title>
        <meta name="description" content="Diloloji — Fransızca ve İspanyolca fiil çekimleri, ezber alıştırmaları ve sözlük. Dilin matematiğini çözün." />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title" content="Diloloji — The Mathematics of Language" />
        <meta property="og:description" content="Verb Laboratory & Memorization Machine. Conjugate, practice, and master French and Spanish." />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:type" content="website" />
      </Helmet>
      <BackgroundWithPattern mouseX={mouse.x} mouseY={mouse.y} />

      <Navbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28">
        {/* Hero — minimalist, prestigious */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-16 mb-16 lg:mb-24"
        >
          <div className="flex-1 text-center lg:text-left">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
              Dilin Matematiğini Keşfedin.
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              Yapay zeka ile kelimelerin ve fiillerin kalbine inin, dilleri analitik bir yaklaşımla çözün.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-3"
            >
              <Link
                to="/sozluk"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-night-950"
              >
                <Search className="w-5 h-5" strokeWidth={2} />
                Sözlükten Ara
              </Link>
              <Link
                to="/fiil-laboratuvari"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold border border-slate-300 dark:border-white/20 bg-white/50 dark:bg-white/5 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-night-950"
              >
                Şimdi Başla
              </Link>
            </motion.div>
          </div>
          {/* Hero visual — Syntax Flow (Dilin Matematiği) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1 flex items-center justify-center"
          >
            <SyntaxFlowHero />
          </motion.div>
        </motion.section>

        {/* SRS / Günlük hedef paneli — kullanıcının ilerlemesi varsa gösterilir */}
        {(dueMistakes.length > 0 || goal.streak > 0 || goal.todayCount > 0) && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="mb-16 lg:mb-20"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Bugün tekrar etmen gereken N çekim */}
              <Link
                to={dueMistakes.length > 0 ? '/fiil-laboratuvari?mode=review' : '/fiil-laboratuvari'}
                className="group relative rounded-2xl border border-rose-300/40 dark:border-rose-400/30 bg-white/60 dark:bg-rose-500/10 backdrop-blur-sm p-5 hover:border-rose-400/60 dark:hover:border-rose-400/50 hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 dark:text-rose-300 shrink-0">
                    <RefreshCcw className="w-5 h-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-600/80 dark:text-rose-300/80">
                      Tekrar Zamanı
                    </p>
                    <p className="mt-1 text-slate-800 dark:text-slate-100 font-bold text-lg leading-tight">
                      {dueMistakes.length > 0
                        ? `Bugün tekrar etmen gereken ${dueMistakes.length} çekim`
                        : 'Bugün tekrar bekleyen çekim yok'}
                    </p>
                    {topMistakes.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        En zor:{' '}
                        {topMistakes.map((m) => `${m.verb} (${m.mistakeCount}×)`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </Link>

              {/* Günlük hedef */}
              <div className="rounded-2xl border border-indigo-300/40 dark:border-indigo-400/30 bg-white/60 dark:bg-indigo-500/10 backdrop-blur-sm p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shrink-0">
                    <Target className="w-5 h-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/80 dark:text-indigo-300/80">
                      Günlük Hedef
                    </p>
                    <p className="mt-1 text-slate-800 dark:text-slate-100 font-bold text-lg tabular-nums">
                      {goal.todayCount} / {DAILY_GOAL} çekim
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          goal.metToday
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-indigo-500 to-blue-400'
                        }`}
                        style={{ width: `${goal.percent}%` }}
                        role="progressbar"
                        aria-valuenow={goal.todayCount}
                        aria-valuemin={0}
                        aria-valuemax={DAILY_GOAL}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {goal.metToday
                        ? 'Hedef tamamlandı! Streak korundu.'
                        : `Streak için ${goal.remaining} çekim kaldı.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Streak */}
              <div className="rounded-2xl border border-amber-300/40 dark:border-amber-400/30 bg-white/60 dark:bg-amber-500/10 backdrop-blur-sm p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 shrink-0">
                    <Flame className="w-5 h-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/80 dark:text-amber-300/80">
                      Günlük Seri
                    </p>
                    <p className="mt-1 text-slate-800 dark:text-slate-100 font-bold text-2xl tabular-nums">
                      {goal.streak}{' '}
                      <span className="text-base font-semibold text-slate-500 dark:text-slate-400">
                        gün
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {goal.streak === 0
                        ? 'Bugün başla, ilk günü kazan.'
                        : goal.metToday
                          ? 'Harika gidiyorsun, devam et!'
                          : 'Bugün hedefi tamamla, seri kırılmasın.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Sosyal kanıt — hero altı: canlı sayaçlar + testimoniallar */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mb-24 lg:mb-32"
        >
          <div ref={socialProofRef} className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm p-8 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
              <div className="text-center md:text-left">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Diloloji ile öğrenen</p>
                <p className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {countUsers.toLocaleString('tr-TR')}+
                </p>
                <p className="text-slate-600 dark:text-slate-300 text-lg font-semibold mt-1">kullanıcı</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Bugün aranan kelime</p>
                <p className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {countWords.toLocaleString('tr-TR')}
                </p>
                <p className="text-slate-600 dark:text-slate-300 text-lg font-semibold mt-1">kelime</p>
              </div>
            </div>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
              Kullanıcılarımız ne diyor?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Elif K.', lang: 'Fransızca', level: 'B2', text: 'Fiil çekimlerini artık formül gibi görüyorum. Ezber Makinesi sayesinde kalıcı öğrendim.', avatar: '🇫🇷' },
                { name: 'Can T.', lang: 'İspanyolca', level: 'A2', text: 'Sözlük ve örnek cümleler çok işime yarıyor. Her gün 10 dakika ayırıyorum.', avatar: '🇪🇸' },
                { name: 'Zeynep A.', lang: 'İngilizce', level: 'C1', text: 'Cümle Laboratuvarı ile gramer kafama oturdu. Kesinlikle tavsiye ederim.', avatar: '🇬🇧' },
              ].map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.1 }}
                  className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg" aria-hidden>{t.avatar}</span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.lang} · {t.level}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Özellik kartları — Sözlük, Fiil Lab, Ezber, Öğrenme (grid) */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="mb-24 lg:mb-32"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {[
              { to: '/sozluk', title: 'Sözlük', desc: 'Yapay zeka destekli kelime analizi, örnek cümleler ve sesli okuma.', icon: BookA, iconClass: 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400', cardClass: 'hover:border-indigo-500/30' },
              { to: '/fiil-laboratuvari', title: 'Fiil Laboratuvarı', desc: 'Tüm zamanlarda çekimler, örnekler ve alıştırmalar.', icon: FlaskConical, iconClass: 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400', cardClass: 'hover:border-emerald-500/30' },
              { to: '/ezber-makinesi', title: 'Ezber Makinesi', desc: 'Quiz, zamana karşı ve kıyaslama ile kalıcı öğrenme.', icon: Brain, iconClass: 'bg-pink-500/15 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400', cardClass: 'hover:border-pink-500/30' },
              { to: '/ogrenme', title: 'Öğrenme Yolu', desc: 'A1’den C1’e adım adım müfredat ve ünite dersleri.', icon: GraduationCap, iconClass: 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400', cardClass: 'hover:border-amber-500/30' },
              { to: '/simulator', title: 'Yapay Zeka Simülatörü', desc: 'Gerçek hayat senaryolarında roleplay ile konuşma pratiği. Görev tamamla, XP kazan.', icon: MessageCircle, iconClass: 'bg-violet-500/15 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400', cardClass: 'hover:border-violet-500/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)] dark:hover:shadow-[0_0_28px_rgba(139,92,246,0.25)]' },
              { to: '/historia', title: 'Historia Mode', desc: 'İspanyolca sahneler içinde doğru zamanı seç, çekimi yaz. Puan biriktir, zayıf noktanı keşfet.', icon: Sparkles, iconClass: 'bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400', cardClass: 'hover:border-rose-500/40 hover:shadow-[0_0_24px_rgba(244,63,94,0.18)] dark:hover:shadow-[0_0_28px_rgba(244,63,94,0.22)]' },
              { to: '/cloze-sprint', title: 'Cloze Sprint', desc: '60 saniyede ne kadar çekim doğru yapabilirsin? Hızlı boşluk doldurma, anlık geri bildirim, günlük rekor.', icon: Zap, iconClass: 'bg-sky-500/15 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400', cardClass: 'hover:border-sky-500/40 hover:shadow-[0_0_24px_rgba(14,165,233,0.18)] dark:hover:shadow-[0_0_28px_rgba(14,165,233,0.22)]' },
              { to: '/haberler', title: 'Okuma Modu', desc: 'Gerçek İspanyolca haberleri oku; fiiller vurgulanır, kelimelere tıklayıp Türkçe çevirisini gör.', icon: Newspaper, iconClass: 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400', cardClass: 'hover:border-amber-500/40 hover:shadow-[0_0_24px_rgba(245,158,11,0.18)] dark:hover:shadow-[0_0_28px_rgba(245,158,11,0.22)]' },
              { to: '/syntax-lab', title: 'Cümle Laboratuvarı', desc: 'Cümleleri matematiksel olarak analiz edin. Kelime türü, kök ve çeviri.', icon: Braces, iconClass: 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400', cardClass: 'hover:border-amber-500/40 hover:shadow-[0_0_24px_rgba(245,158,11,0.18)] dark:hover:shadow-[0_0_28px_rgba(245,158,11,0.22)]' },
            ].map((item, i) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link
                  to={item.to}
                  className={`group block h-full rounded-xl border border-slate-200/60 dark:border-white/10 backdrop-blur-sm bg-white/50 dark:bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-glass dark:hover:shadow-glass-dark ${item.cardClass} focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-night-950`}
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${item.iconClass} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Desteklenen Diller — compact */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-20"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
            Desteklenen Diller
          </p>
          <div className="glass-panel px-6 py-4">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 sm:gap-x-14">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = lang.code === 'fr' || lang.code === 'es';
                return (
                  <div
                    key={lang.code}
                    className={`flex items-center gap-2 text-slate-700 dark:text-slate-200 ${!isActive ? 'opacity-65 dark:opacity-70 grayscale cursor-default pointer-events-none' : ''}`}
                  >
                    <span className="text-2xl" aria-hidden>{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.name}</span>
                    {!isActive && (
                      <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {t('coming_soon')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Feature Grid — Neden Diloloji? */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-24 lg:mb-32"
        >
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-12 lg:mb-16">
            Neden Diloloji?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} isAlgo={f.title === 'Algoritmik Öğrenme'} />
            ))}
          </div>
        </motion.section>

        {/* How it works / Nasıl Çalışır */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="pt-12 lg:pt-16 border-t border-white/10 dark:border-white/10"
        >
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-12 lg:mb-16">
            {t('how_it_works')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {HOW_IT_WORKS.map((item, i) => {
              const StepIcon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="relative glass-panel-strong p-6 lg:p-8 text-center overflow-hidden"
                >
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 opacity-[0.07] dark:opacity-[0.1] pointer-events-none" aria-hidden>
                    <StepIcon className="w-20 h-20 sm:w-24 sm:h-24 text-indigo-500 dark:text-indigo-400" strokeWidth={1.5} />
                  </div>
                  <span className="relative z-10 text-3xl font-bold text-slate-300 dark:text-white/20 mb-4 block">{item.step}</span>
                  <h3 className="relative z-10 text-lg font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="relative z-10 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-6 w-4 h-px bg-white/20 z-10" aria-hidden />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Stats bar — count-up when in view */}
        <motion.section
          ref={statsRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20 lg:mt-28 pb-16 lg:pb-24"
        >
          <div className="glass-panel-strong px-6 py-8 sm:px-10 sm:py-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 text-center">
              {STATS.map((stat) => (
                <StatRow key={stat.label} stat={stat} inView={statsInView} />
              ))}
            </div>
          </div>
        </motion.section>

        <Footer />
      </main>
    </div>
  );
}
