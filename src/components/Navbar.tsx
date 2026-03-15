/**
 * Navbar — Üç blok: Sol (Logo), Orta (4 ana link, lg+), Sağ (Giriş Yap, Pro'ya Geç, Hamburger).
 * lg altında orta linkler gizlenir, hepsi hamburger menüde toplanır.
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { Menu, X, User, LogOut, Sun, Moon, Languages } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useThemeContext } from '../contexts/ThemeContext';
import LoginModal from './LoginModal';

const MAIN_LINKS = [
  { to: '/sozluk', labelKey: 'sozluk' },
  { to: '/fiil-laboratuvari', labelKey: 'fiil_laboratuvari' },
  { to: '/ezber-makinesi', labelKey: 'ezber_makinesi' },
  { to: '/ogrenme', labelKey: 'ogrenme' },
] as const;

type HamburgerLinkItem = {
  to: string;
  labelKey: string;
  labelFallback: string;
  icon?: LucideIcon;
};

const HAMBURGER_LINKS: HamburgerLinkItem[] = [
  { to: '/syntax-lab', labelKey: 'syntax_lab', labelFallback: 'Cümle Laboratuvarı' },
  { to: '/youtube-lab', labelKey: 'youtube_lab', labelFallback: 'YouTube Lab' },
  { to: '/simulator', labelKey: 'simulator', labelFallback: 'Simülatör' },
  { to: '/leaderboard', labelKey: 'leaderboard', labelFallback: 'Ligler' },
  { to: '/profil', labelKey: 'profil', labelFallback: 'Profil', icon: User },
];

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
  const [internalLoggedIn, setInternalLoggedIn] = useState(false);
  const resolvedLoggedIn = isLoggedIn !== undefined ? isLoggedIn : internalLoggedIn;
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const openLoginModal = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (onLoginClick) onLoginClick();
    else setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = () => {
    setInternalLoggedIn(true);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    if (onLogoutClick) onLogoutClick();
    else setInternalLoggedIn(false);
  };

  useEffect(() => {
    if (!langOpen) return;
    const handle = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [langOpen]);

  useEffect(() => {
    if (hamburgerOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [hamburgerOpen]);

  const closeHamburger = () => setHamburgerOpen(false);
  const isActive = (path: string) => location.pathname === path;

  const langLabel = (lng: string) =>
    lng === 'tr' ? 'Türkçe' : lng === 'en' ? 'English' : lng === 'fr' ? 'Français' : 'Español';
  const currentLang = (i18n.language || 'tr').slice(0, 2);

  return (
    <>
      <header
        data-print-hide={printHide ? true : undefined}
        className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#0a0e17]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 transition-all duration-300 print:hidden"
      >
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-4 h-16 gap-4">
          {/* Sol — Logo */}
          <div className="flex items-center shrink-0 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17] rounded-lg"
              aria-label="Ana sayfa"
            >
              <img
                src={mounted && isDark ? '/logo-dark.svg' : '/logo-light.svg'}
                alt="Diloloji"
                className="h-8 sm:h-9 w-auto shrink-0"
              />
              <span className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider hidden sm:inline whitespace-nowrap">
                Diloloji
              </span>
            </Link>
          </div>

          {/* Orta — Sadece 4 ana link (lg ve üzeri) */}
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
                      : 'text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {t(labelKey)}
                </Link>
              );
            })}
          </nav>

          {/* Sağ — Giriş Yap, Pro'ya Geç, Hamburger (shrink-0) */}
          <div className="flex items-center gap-2 shrink-0">
            {!resolvedLoggedIn && (
              <button
                type="button"
                onClick={openLoginModal}
                aria-label="Oturum aç"
                className="h-9 px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-300/50 dark:border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0 whitespace-nowrap"
              >
                Giriş Yap
              </button>
            )}
            <Link
              to="/pricing"
              className="h-9 px-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 shadow-md shadow-amber-500/25 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17] flex items-center shrink-0 whitespace-nowrap"
            >
              🌟 Pro&apos;ya Geç
            </Link>
            <button
              type="button"
              onClick={() => setHamburgerOpen((o) => !o)}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
              aria-expanded={hamburgerOpen}
              aria-label={hamburgerOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            >
              <Menu className="w-5 h-5" strokeWidth={2} aria-hidden />
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
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-xl border-l border-slate-200/50 dark:border-white/10 shadow-2xl flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Menü"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/50 dark:border-white/5 shrink-0">
                <span className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">
                  Menü
                </span>
                <button
                  type="button"
                  onClick={closeHamburger}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  aria-label="Menüyü kapat"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              <nav className="flex flex-col p-4 gap-1 overflow-y-auto">
                {/* lg altında: 4 ana link de burada */}
                <div className="lg:hidden flex flex-col gap-1">
                  {MAIN_LINKS.map(({ to, labelKey }) => {
                    const active = isActive(to);
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={closeHamburger}
                        className={`w-full py-3 px-4 rounded-xl text-left text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                          active
                            ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-200'
                            : 'bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-white/10'
                        }`}
                      >
                        {t(labelKey)}
                      </Link>
                    );
                  })}
                  <div className="my-2 border-t border-slate-200/50 dark:border-white/10" />
                </div>

                {/* Cümle Laboratuvarı, Simülatör, Ligler, Profil */}
                {HAMBURGER_LINKS.map(({ to, labelKey, labelFallback, icon: Icon }) => {
                  if (to === '/profil' && !resolvedLoggedIn) return null;
                  const active = isActive(to);
                  const translated = labelKey ? t(labelKey) : '';
                  const label = (translated && translated !== labelKey) ? translated : (labelFallback ?? translated);
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={closeHamburger}
                      className={`w-full py-3 px-4 rounded-xl text-left text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                        active
                          ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-200'
                          : 'bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-white/10'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />}
                      {label}
                    </Link>
                  );
                })}

                <div className="my-2 border-t border-slate-200/50 dark:border-white/10" />

                {/* Dil Ayarları (TR) */}
                <div className="relative" ref={langRef}>
                  <button
                    type="button"
                    onClick={() => setLangOpen((o) => !o)}
                    className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center gap-2 bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <Languages className="w-4 h-4 shrink-0" strokeWidth={2} />
                    Dil Ayarları ({currentLang.toUpperCase()})
                  </button>
                  {langOpen && (
                    <div className="mt-1 py-2 px-2 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 space-y-0.5">
                      {(['tr', 'en', 'fr', 'es'] as const).map((lng) => (
                        <button
                          key={lng}
                          type="button"
                          onClick={() => {
                            i18n.changeLanguage(lng);
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
                    className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center gap-2 bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {isDark ? (
                      <Sun className="w-4 h-4 shrink-0" strokeWidth={2} />
                    ) : (
                      <Moon className="w-4 h-4 shrink-0" strokeWidth={2} />
                    )}
                    Tema ({isDark ? 'Açık' : 'Koyu'})
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
                    className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium mt-2 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    Giriş Yap
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      closeHamburger();
                      handleLogout();
                    }}
                    className="w-full mt-2 py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center justify-center gap-2 bg-slate-100/80 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    aria-label="Çıkış yap"
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
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}
