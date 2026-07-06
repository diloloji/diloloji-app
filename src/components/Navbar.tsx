/**
 * Navbar — Üç blok: Sol (Logo), Orta (3 ana link, lg+), Sağ (XP, seri, dil, Giriş Yap, Hamburger).
 * lg altında orta linkler gizlenir, hepsi hamburger menüde toplanır.
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { Menu, X, LogOut, Sun, Moon, Globe, BookOpen, Flame, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useThemeContext } from '../contexts/ThemeContext';
import { useXp } from '../contexts/XpContext';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';
import { getDailyGoalSummary, updateDocumentTitle, DAILY_GOAL } from '../utils/dailyGoal';
import AutoSpeakToggle from './speech/AutoSpeakToggle';
import { persistManualUiLocale } from '../i18n/index';

/** Mobilde: sadece seviye ikonu + sayı (kompakt) — tıklanınca /profil */
function NavbarXpCompact() {
  const { t } = useTranslation();
  const { level, title } = useXp();
  return (
    <Link
      to="/profil"
      className="md:hidden flex h-10 min-w-[44px] items-center justify-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-2.5 text-left transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-500/15 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
      title={t('nav.levelTitle', { level, title })}
      aria-label={`${t('nav.levelTitle', { level, title })}. Profilde XP ve seviye yolculuğu`}
    >
      <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" strokeWidth={2} aria-hidden />
      <span className="text-sm font-bold tabular-nums text-indigo-700 dark:text-indigo-300">Lv.{level}</span>
    </Link>
  );
}

function NavbarXpChip() {
  const { t } = useTranslation();
  const { level, title, xpProgress } = useXp();
  return (
    <Link
      to="/profil"
      className="hidden md:flex flex-col gap-1 min-w-[8.5rem] max-w-[11rem] rounded-lg px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-left transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-500/15 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
      title={t('nav.levelTitle', { level, title })}
      aria-label={`${t('nav.levelTitle', { level, title })}. Profilde XP ve seviye yolculuğu`}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 leading-tight">
        <Sparkles className="w-3.5 h-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="tabular-nums">Lv.{level}</span>
        <span className="font-semibold truncate opacity-80">{title}</span>
      </span>
      <div className="h-1 rounded-full bg-indigo-200/50 dark:bg-white/10 overflow-hidden" aria-hidden>
        <div
          className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.round(xpProgress.percent)}%` }}
        />
      </div>
      <span className="text-[9px] text-indigo-600/70 dark:text-indigo-300/60 tabular-nums">
        {xpProgress.xpNeededForNext > 0
          ? `${xpProgress.xpInCurrentLevel} / ${xpProgress.xpNeededForNext} XP`
          : `${xpProgress.xpInCurrentLevel.toLocaleString('tr-TR')} XP`}
      </span>
    </Link>
  );
}

const MAIN_LINKS = [
  { to: '/sozluk', labelKey: 'nav.dictionary' },
  { to: '/fiil-laboratuvari', labelKey: 'nav.verbLab' },
  { to: '/ezber-makinesi', labelKey: 'nav.memorizer' },
] as const;

const UI_LOCALES = ['tr', 'es', 'fr', 'en'] as const;

type HamburgerLinkItem = {
  to: string;
  labelKey: string;
  labelFallback: string;
  icon?: LucideIcon;
};

/** Odak conjugaison + sözlük olduğu için ikincil mod linkleri şimdilik boş; sayfalar devre dışı bırakıldı (App.tsx'e bakın). */
const HAMBURGER_LINKS: HamburgerLinkItem[] = [];

export type NavbarProps = {
  rightExtra?: React.ReactNode;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  isLoggedIn?: boolean;
  printHide?: boolean;
};

export default function Navbar({ onLoginClick, onLogoutClick, isLoggedIn, printHide }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { isDark, toggleTheme, mounted } = useThemeContext();
  const { user, signOut } = useAuth();
  const authLoggedIn = !!user;
  const resolvedLoggedIn = isLoggedIn !== undefined ? isLoggedIn : authLoggedIn;
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const [desktopLangOpen, setDesktopLangOpen] = useState(false);
  const desktopLangRef = useRef<HTMLDivElement>(null);
  const [dailyGoal, setDailyGoal] = useState(() => getDailyGoalSummary());

  // localStorage'tan günlük hedef ve streak verisini canlı tutar:
  // diğer sekmeden değişiklik (storage event) ve sayfa odağı geri döndüğünde tazelenir.
  useEffect(() => {
    const refresh = () => {
      setDailyGoal(getDailyGoalSummary());
      updateDocumentTitle();
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const intervalId = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(intervalId);
    };
  }, [location.pathname]);

  const openLoginModal = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (onLoginClick) onLoginClick();
    else setIsLoginModalOpen(true);
  };

  const handleLogout = () => {
    if (onLogoutClick) void onLogoutClick();
    else void signOut();
  };

  useEffect(() => {
    const open = () => setIsLoginModalOpen(true);
    window.addEventListener('diloloji-open-auth-modal', open);
    return () => window.removeEventListener('diloloji-open-auth-modal', open);
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const handle = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [langOpen]);

  useEffect(() => {
    if (!desktopLangOpen) return;
    const handle = (e: MouseEvent) => {
      if (desktopLangRef.current && !desktopLangRef.current.contains(e.target as Node)) setDesktopLangOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [desktopLangOpen]);

  useEffect(() => {
    if (hamburgerOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [hamburgerOpen]);

  const closeHamburger = () => setHamburgerOpen(false);
  const isActive = (path: string) => location.pathname === path;

  const langLabel = (lng: 'tr' | 'en' | 'fr' | 'es') =>
    ({ tr: t('langs.tr'), en: t('langs.en'), fr: t('langs.fr'), es: t('langs.es') }[lng]);
  const currentLang = (i18n.language || 'tr').slice(0, 2);

  return (
    <>
      <header
        data-print-hide={printHide ? true : undefined}
        className="sticky top-0 z-50 w-full max-w-[100vw] bg-white/80 dark:bg-[#05080f]/80 backdrop-blur-md border-b border-slate-200/40 dark:border-white/5 transition-all duration-300 print:hidden pt-[env(safe-area-inset-top,0px)]"
      >
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto pl-1 pr-2 sm:pr-4 min-h-[4.5rem] sm:min-h-[5rem] py-1.5 gap-2 sm:gap-4">
          {/* Sol — Logo (sadece ikon), sola yaslı */}
          <div className="flex items-center shrink-0 min-w-0">
            <Link
              to="/"
              className="flex items-center cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17] rounded-lg"
              aria-label={t('nav.home')}
            >
              <img
                src={mounted && isDark ? '/logo-dark.svg' : '/logo-light.svg'}
                alt="Diloloji"
                className="h-[62px] sm:h-[73px] w-auto shrink-0"
              />
            </Link>
          </div>

          {/* Orta — Sadece 3 ana link (lg ve üzeri) */}
          <nav
            className="hidden lg:flex items-center justify-center flex-1 min-w-0 gap-6"
            role="navigation"
            aria-label="Ana menü"
          >
            {MAIN_LINKS.map(({ to, labelKey }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`text-sm font-medium whitespace-nowrap rounded-lg px-2 py-1.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17] shrink-0 ${
                    active
                      ? 'text-indigo-600 dark:text-white bg-indigo-500/10 dark:bg-indigo-500/15'
                      : 'text-gray-400 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-200'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {t(labelKey)}
                </Link>
              );
            })}
          </nav>

          {/* Sağ — XP / günlük hedef, dil, Giriş Yap, Hamburger (shrink-0) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
            <NavbarXpCompact />
            <NavbarXpChip />
            <div className="hidden lg:block relative" ref={desktopLangRef}>
              <button
                type="button"
                onClick={() => setDesktopLangOpen((o) => !o)}
                className="flex items-center gap-1 h-9 px-2.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                aria-haspopup="listbox"
                aria-expanded={desktopLangOpen}
                aria-label={t('common.uiLanguage')}
              >
                <Globe className="w-4 h-4" strokeWidth={2} aria-hidden />
                <span className="uppercase tabular-nums">{currentLang}</span>
              </button>
              <AnimatePresence>
                {desktopLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1.5 py-1.5 px-1.5 rounded-xl bg-white dark:bg-[#11151f] shadow-lg shadow-slate-900/10 dark:shadow-black/40 space-y-0.5 min-w-[8rem] z-10"
                    role="listbox"
                  >
                    {UI_LOCALES.map((lng) => (
                      <button
                        key={lng}
                        type="button"
                        onClick={() => {
                          persistManualUiLocale(lng);
                          void i18n.changeLanguage(lng);
                          setDesktopLangOpen(false);
                        }}
                        className={`w-full text-left py-1.5 px-2.5 rounded-lg text-sm font-medium transition-colors ${
                          currentLang === lng
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                        role="option"
                        aria-selected={currentLang === lng}
                      >
                        {langLabel(lng)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link
              to="/"
              className={`hidden md:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                dailyGoal.metToday || dailyGoal.streak > 0
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/15'
                  : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title={t('nav.dailyStreakTitle', { streak: dailyGoal.streak, today: dailyGoal.todayCount, goal: DAILY_GOAL })}
              aria-label={t('nav.dailyStreakAria', { streak: dailyGoal.streak, today: dailyGoal.todayCount, goal: DAILY_GOAL })}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <span className="tabular-nums">{dailyGoal.streak}</span>
              <span className="opacity-60 tabular-nums">{dailyGoal.todayCount}/{DAILY_GOAL}</span>
            </Link>
            {!resolvedLoggedIn && (
              <button
                type="button"
                onClick={openLoginModal}
                aria-label={t('nav.signInAria')}
                className="hidden md:inline-flex px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0 whitespace-nowrap"
              >
                {t('nav.signIn')}
              </button>
            )}
            {resolvedLoggedIn && user && (
              <div className="hidden md:flex items-center gap-2 shrink-0 max-w-[14rem]">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-600 dark:text-indigo-200"
                  aria-hidden
                >
                  {(user.email ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate" title={user.email ?? ''}>
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="rounded-lg p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  aria-label={t('nav.logout')}
                >
                  <LogOut className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setHamburgerOpen((o) => !o)}
              className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0 touch-manipulation"
              aria-expanded={hamburgerOpen}
              aria-label={hamburgerOpen ? t('nav.menuClose') : t('nav.menuOpen')}
            >
              <Menu className="w-6 h-6" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger menü — cam efekti + Framer Motion */}
      <AnimatePresence>
        {hamburgerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/50 dark:bg-slate-950/60 backdrop-blur-sm"
              aria-hidden
              onClick={closeHamburger}
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-0 z-50 flex flex-col bg-white/98 dark:bg-[#0d1117]/98 backdrop-blur-xl md:inset-y-0 md:left-auto md:right-0 md:top-0 md:bottom-0 md:w-full md:max-w-sm md:shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.menu')}
            >
              <div
                className="flex items-center justify-between h-16 px-4 shrink-0"
                style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
              >
                <span className="font-bold text-slate-800 dark:text-white text-base">
                  {t('nav.menu')}
                </span>
                <button
                  type="button"
                  onClick={closeHamburger}
                  className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 touch-manipulation"
                  aria-label="Menüyü kapat"
                >
                  <X className="w-6 h-6" strokeWidth={2} />
                </button>
              </div>

              <nav className="flex flex-col p-4 gap-1 overflow-y-auto flex-1 min-h-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {/* lg altında: 3 ana link — mobilde büyük dokunma alanı */}
                <div className="lg:hidden flex flex-col gap-2">
                  {MAIN_LINKS.map(({ to, labelKey }) => {
                    const active = isActive(to);
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={closeHamburger}
                        className={`w-full min-h-[48px] flex items-center py-3 px-4 rounded-xl text-left text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                          active
                            ? 'bg-indigo-500/15 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-200'
                            : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {t(labelKey)}
                      </Link>
                    );
                  })}
                  <div className="my-2 h-px bg-slate-100 dark:bg-white/5" />
                </div>

                {HAMBURGER_LINKS.map(({ to, labelKey, labelFallback, icon: Icon }) => {
                  const active = isActive(to);
                  const translated = labelKey ? t(labelKey) : '';
                  const label = (translated && translated !== labelKey) ? translated : (labelFallback ?? translated);
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={closeHamburger}
                      className={`w-full min-h-[48px] py-3 px-4 rounded-xl text-left text-base font-medium flex items-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                        active
                          ? 'bg-indigo-500/15 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-200'
                          : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />}
                      {label}
                    </Link>
                  );
                })}

                <div className="my-2 h-px bg-slate-100 dark:bg-white/5" />

                {/* Zaman Kartları — İspanyolca zamanların referansı */}
                <button
                  type="button"
                  onClick={() => {
                    closeHamburger();
                    window.dispatchEvent(new CustomEvent('diloloji:open-tense-cards'));
                  }}
                  className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center gap-2 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <BookOpen className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                  {t('nav.tenseCards')}
                </button>

                {/* Ses Ayarı (TTS) */}
                <div className="flex items-center justify-between gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-white/5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('nav.speechReadAloud')}
                  </span>
                  <AutoSpeakToggle variant="pill" />
                </div>

                {/* Dil Ayarları (TR) */}
                <div className="relative" ref={langRef}>
                  <button
                    type="button"
                    onClick={() => setLangOpen((o) => !o)}
                    className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center gap-2 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <Globe className="w-4 h-4 shrink-0" strokeWidth={2} />
                    {t('nav.languageSettings')} ({currentLang.toUpperCase()})
                  </button>
                  {langOpen && (
                    <div className="mt-1 py-2 px-2 rounded-xl bg-slate-50 dark:bg-white/5 space-y-0.5">
                      {(['tr', 'en', 'fr', 'es'] as const).map((lng) => (
                        <button
                          key={lng}
                          type="button"
                          onClick={() => {
                            persistManualUiLocale(lng);
                            void i18n.changeLanguage(lng);
                            setLangOpen(false);
                          }}
                          className={`w-full text-left py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            currentLang === lng
                              ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-white/10'
                          }`}
                        >
                          {langLabel(lng)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tema (Güneş/Ay) */}
                {mounted && (
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center gap-2 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {isDark ? (
                      <Sun className="w-4 h-4 shrink-0" strokeWidth={2} />
                    ) : (
                      <Moon className="w-4 h-4 shrink-0" strokeWidth={2} />
                    )}
                    {t('nav.theme')} ({isDark ? t('nav.themeLight') : t('nav.themeDark')})
                  </button>
                )}

                {/* Alt: Giriş Yap / Çıkış (menü içinde) */}
                {!resolvedLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeHamburger();
                      openLoginModal();
                    }}
                    className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium mt-2 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-500/15 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {t('nav.signIn')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      closeHamburger();
                      handleLogout();
                    }}
                    className="w-full mt-2 py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center justify-center gap-2 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    aria-label={t('nav.logout')}
                  >
                    <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} />
                  </button>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Giriş modalı — parent onLoginClick vermiyorsa kullanılır */}
      {!onLoginClick && (
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      )}

    </>
  );
}
