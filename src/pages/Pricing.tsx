/**
 * Fiyatlandırma — SaaS tarzı aylık/yıllık toggle ve 3 paket kartı.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const SITE_URL = 'https://diloloji.com';

function PricingBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#0f172a] via-40% to-[#1e1b4b] to-[#312e81] transition-colors duration-500 dark:from-[#0b1220] dark:via-[#0f172a] dark:via-[#1e1b4b] dark:to-[#1e1b4b] opacity-0 dark:opacity-100"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200/80 dark:opacity-0 transition-opacity duration-500 opacity-100"
        aria-hidden
      />
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none select-none" aria-hidden>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pricing-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pricing-grid)" className="text-slate-600 dark:text-white" />
        </svg>
      </div>
    </>
  );
}

type PlanId = 'basic' | 'pro' | 'lifetime';

type Plan = {
  id: PlanId;
  name: string;
  nameEn?: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  lifetimePrice: number | null;
  features: string[];
  cta: string;
  ctaEn?: string;
  muted?: boolean;
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Temel',
    nameEn: 'Basic',
    description: 'Ücretsiz',
    monthlyPrice: 0,
    yearlyPrice: 0,
    lifetimePrice: null,
    features: [
      'Kısıtlı sözlük araması',
      'Basit fiil çekim aramaları',
      'Temel örnek cümleler',
      'Reklam destekli deneyim',
    ],
    cta: 'Hemen Başla',
    ctaEn: 'Get Started',
    muted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    nameEn: 'Pro',
    description: 'En çok tercih edilen',
    monthlyPrice: 99,
    yearlyPrice: 79,
    lifetimePrice: null,
    features: [
      'Sınırsız yapay zeka destekli örnek cümleler',
      'Detaylı fiil analizleri ve tüm zamanlar',
      'Reklamsız deneyim',
      'Öncelikli destek',
      'Yeni özelliklere erken erişim',
    ],
    cta: 'Planı Seç',
    ctaEn: 'Choose Plan',
    popular: true,
  },
  {
    id: 'lifetime',
    name: 'Sınırsız',
    nameEn: 'Lifetime',
    description: 'Ömür boyu tek seferlik',
    monthlyPrice: null,
    yearlyPrice: null,
    lifetimePrice: 1999,
    features: [
      'Pro özelliklerinin tamamı',
      'Ömür boyu erişim',
      'Tüm gelecek güncellemeler',
      'Aylık ödeme yok',
      'Tek seferlik ödeme',
    ],
    cta: 'Planı Seç',
    ctaEn: 'Choose Plan',
  },
];

function formatPrice(value: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'decimal', minimumFractionDigits: 0 }).format(value);
}

export default function Pricing() {
  const { isDark, toggleTheme, mounted } = useThemeContext();
  const { t, i18n } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(true);
  const isTr = (i18n.language || 'tr').startsWith('tr');

  return (
    <div className="min-h-screen relative bg-slate-100 dark:bg-transparent transition-colors duration-300">
      <Helmet>
        <title>Fiyatlandırma — Diloloji</title>
        <meta name="description" content="Dilin matematiğini avantajlı çözün. Temel, Pro ve Ömür Boyu planları." />
        <link rel="canonical" href={`${SITE_URL}/fiyatlandirma`} />
      </Helmet>
      <PricingBackground />

      <header className="relative z-20 w-full flex justify-between items-center py-3 px-4 sm:px-6 lg:px-8 bg-transparent border-b border-slate-200/60 dark:border-slate-700/50 sticky top-0 backdrop-blur-md transition-all duration-300">
        <Link
          to="/"
          className="min-w-0 flex items-center gap-2 sm:gap-3 shrink-0 transition-all duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-xl"
          aria-label={isTr ? 'Ana sayfa' : 'Home'}
        >
          <img src="/logo.svg" alt="Diloloji" className="h-8 sm:h-10 w-auto shrink-0" />
          <span className="text-slate-400 dark:text-slate-500 text-xs italic hidden sm:inline shrink-0 opacity-60">
            {isTr ? 'Dilin matematiğini çöz.' : 'Solve the math of language.'}
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/sozluk"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300"
          >
            {t('sozluk')}
          </Link>
          <Link
            to="/ogrenme"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300"
          >
            {t('ogrenme')}
          </Link>
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title={isDark ? (isTr ? 'Açık mod' : 'Light mode') : isTr ? 'Karanlık mod' : 'Dark mode'}
              aria-label={isDark ? (isTr ? 'Açık moda geç' : 'Switch to light') : isTr ? 'Karanlık moda geç' : 'Switch to dark'}
            >
              <span className="text-base w-5 h-5 inline-flex items-center justify-center leading-none" aria-hidden>
                {isDark ? '☀️' : '🌙'}
              </span>
            </button>
          )}
        </nav>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Başlık */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            {isTr ? 'Dilin Matematiğini Avantajlı Çözün' : 'Solve the Math of Language — Affordably'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-8">
            {isTr ? 'İhtiyacınıza uygun planı seçin, hemen başlayın.' : 'Choose the plan that fits you and get started.'}
          </p>

          {/* Aylık / Yıllık toggle — sadece Pro için anlamlı, yine de gösteriyoruz */}
          <div className="inline-flex items-center gap-3 rounded-full bg-slate-200/80 dark:bg-slate-700/60 p-1.5 backdrop-blur-sm border border-slate-300/50 dark:border-slate-600/50">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                !isAnnual
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {isTr ? 'Aylık' : 'Monthly'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAnnual}
              onClick={() => setIsAnnual((prev) => !prev)}
              className="relative w-12 h-6 rounded-full bg-indigo-500 dark:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
            >
              <span
                className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
                style={{ transform: isAnnual ? 'translateX(24px)' : 'translateX(0)' }}
              />
            </button>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                isAnnual
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {isTr ? 'Yıllık' : 'Yearly'}
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded">
                %20
              </span>
            </span>
          </div>
        </motion.section>

        {/* Kartlar */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {PLANS.map((plan, index) => {
            const isLifetime = plan.id === 'lifetime';
            const price =
              isLifetime && plan.lifetimePrice != null
                ? plan.lifetimePrice
                : isAnnual && plan.yearlyPrice != null
                  ? plan.yearlyPrice
                  : plan.monthlyPrice;
            const priceLabel = isLifetime
              ? isTr
                ? 'tek seferlik'
                : 'one-time'
              : isAnnual
                ? isTr
                  ? '/ay (yıllık ödeme)'
                  : '/mo (billed yearly)'
                : isTr
                  ? '/ay'
                  : '/mo';

            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative rounded-2xl border bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col ${
                  plan.muted
                    ? 'border-slate-300/60 dark:border-slate-600/50 text-slate-700 dark:text-slate-300'
                    : plan.popular
                      ? 'border-transparent ring-2 ring-indigo-400/60 dark:ring-indigo-400/50 shadow-indigo-500/10 scale-105 z-10'
                      : 'border-white/20 dark:border-white/10'
                }`}
              >
                {/* Pro: gradient kenarlık efekti */}
                {plan.popular && (
                  <div
                    className="absolute inset-0 rounded-2xl opacity-100 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 50%, rgba(99,102,241,0.15) 100%)',
                    }}
                    aria-hidden
                  />
                )}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-20">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500 dark:bg-indigo-500 text-white text-xs font-semibold px-3 py-1 shadow-lg">
                      <Sparkles className="w-3.5 h-3.5" />
                      {isTr ? 'En Çok Tercih Edilen' : 'Most Popular'}
                    </span>
                  </div>
                )}

                <div className="relative z-10 flex flex-col flex-1 p-6 sm:p-8">
                  <div className="mb-6">
                    <h2
                      className={`text-xl font-bold ${
                        plan.muted ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isTr ? plan.name : plan.nameEn ?? plan.name}
                    </h2>
                    <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
                      {isTr ? plan.description : (plan.id === 'basic' ? 'Free' : plan.id === 'lifetime' ? 'Lifetime one-time' : 'Most popular')}
                    </p>
                  </div>

                  <div className="mb-6">
                    {price !== null && (
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span
                          className={`text-3xl sm:text-4xl font-bold tabular-nums ${
                            plan.muted ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {price === 0 ? (isTr ? 'Ücretsiz' : 'Free') : formatPrice(price)}
                        </span>
                        {price !== 0 && (
                          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{priceLabel}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 dark:bg-emerald-500/25 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={plan.id === 'basic' ? '/sozluk' : '/'}
                    className={`w-full inline-flex items-center justify-center rounded-xl py-3.5 px-4 text-base font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 ${
                      plan.muted
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                        : plan.popular
                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-500 shadow-lg shadow-indigo-500/25'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 focus:ring-indigo-500'
                    }`}
                  >
                    {isTr ? plan.cta : plan.ctaEn ?? plan.cta}
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
