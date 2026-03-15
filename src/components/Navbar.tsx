/**
 * Navbar — Üçlü blok: Sol (Logo), Orta (Linkler, xl+), Sağ (İstatistik + Tema/Dil + Pro).
 * Flexbox ile overlap yok; absolute konumlandırma kullanılmaz. xl altında hamburger + mobil menü.
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookA, BookOpen, Brain, Star, Flame, FlaskConical, User, Trophy, Menu, X, LogOut } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import { useXp } from '../contexts/XpContext';

const NAV_LINKS = [
  { to: '/sozluk', labelKey: 'sozluk', icon: BookA },
  { to: '/fiil-laboratuvari', labelKey: 'fiil_laboratuvari', icon: BookOpen },
  { to: '/syntax-lab', labelKey: 'syntax_lab', icon: FlaskConical },
  { to: '/ezber-makinesi', labelKey: 'ezber_makinesi', icon: BookOpen },
  { to: '/ogrenme', labelKey: 'ogrenme', icon: BookOpen },
  { to: '/simulator', labelKey: 'simulator', icon: Flame },
  { to: '/leaderboard', labelKey: 'leaderboard', icon: Trophy },
] as const;

export type NavbarProps = {
  rightExtra?: React.ReactNode;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  isLoggedIn?: boolean;
  printHide?: boolean;
};

export default function Navbar({ rightExtra, onLoginClick, onLogoutClick, isLoggedIn, printHide }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { isDark, toggleTheme, mounted } = useThemeContext();
  const { totalXP, level, streak } = useXp();
  const [internalLoggedIn, setInternalLoggedIn] = useState(false);
  const resolvedLoggedIn = isLoggedIn !== undefined ? isLoggedIn : internalLoggedIn;
  const [uiLangDropdownOpen, setUiLangDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const uiLangDropdownRef = useRef<HTMLDivElement>(null);

  /** Sadece oturum açma: modal açar veya mock login. Asla /pricing veya başka sayfaya yönlendirmez. */
  const handleLogin = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (onLoginClick) onLoginClick();
    else setInternalLoggedIn(true);
  };
  const handleLogout = () => {
    if (onLogoutClick) onLogoutClick();
    else setInternalLoggedIn(false);
  };

  useEffect(() => {
    if (!uiLangDropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (uiLangDropdownRef.current && !uiLangDropdownRef.current.contains(e.target as Node)) {
        setUiLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [uiLangDropdownOpen]);

  const closeMobile = () => setIsMobileMenuOpen(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header
        data-print-hide={printHide ? true : undefined}
        className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#0a0e17]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 transition-all duration-300 print:hidden"
      >
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-4 h-16">
          {/* Sol — Logo */}
          <div className="flex items-center shrink-0 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17] rounded-lg"
              aria-label="Ana sayfa"
            >
              <img src="/logo.svg" alt="Diloloji" className="h-8 sm:h-9 w-auto shrink-0" />
              <span className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider hidden sm:inline whitespace-nowrap">
                Diloloji
              </span>
            </Link>
          </div>

          {/* Orta — Ana linkler (sadece xl ve üzeri; sıkışmayı önlemek için) */}
          <nav
            className="hidden xl:flex items-center gap-6 flex-1 justify-center min-w-0"
            role="navigation"
            aria-label="Ana menü"
          >
            {NAV_LINKS.map(({ to, labelKey, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`rounded-lg px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17] flex items-center gap-1.5 shrink-0 ${
                    active
                      ? 'text-indigo-600 dark:text-white bg-indigo-500/10 dark:bg-indigo-500/15'
                      : 'text-gray-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />}
                  {t(labelKey)}
                </Link>
              );
            })}
          </nav>

          {/* Sağ — İstatistikler + Tema/Dil/Giriş + Pro; shrink-0 ile ezilmez */}
          <div className="flex items-center gap-4 shrink-0 min-w-0">
            {/* Hamburger — xl altında göster */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              className="xl:hidden h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            >
              <Menu className="w-5 h-5" strokeWidth={2} aria-hidden />
            </button>

            {/* İstatistikler — sadece giriş yapıldığında */}
            {resolvedLoggedIn && (
              <div
                className="hidden sm:flex items-center gap-3 text-slate-500 dark:text-slate-400 shrink-0"
                aria-live="polite"
              >
                <span
                  className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium tabular-nums whitespace-nowrap"
                  title="Günlük seri"
                >
                  <span
                    className={`inline-flex shrink-0 ${streak >= 1 ? 'text-amber-500 dark:text-amber-400' : 'opacity-50 grayscale'}`}
                    aria-hidden
                  >
                    🔥
                  </span>
                  <span className="tabular-nums">{streak}</span>
                </span>
                <span
                  className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium tabular-nums whitespace-nowrap shrink-0"
                  title="Toplam XP"
                >
                  <Brain className="w-4 h-4 shrink-0 text-amber-500/90 dark:text-amber-400/90" strokeWidth={2} aria-hidden />
                  {totalXP}
                </span>
                <span
                  className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium tabular-nums whitespace-nowrap shrink-0"
                  title="Seviye"
                >
                  <Star className="w-4 h-4 shrink-0 text-amber-500/90 dark:text-amber-400/90" strokeWidth={2} aria-hidden />
                  {level}
                </span>
              </div>
            )}

            {resolvedLoggedIn && rightExtra && (
              <div className="hidden md:flex items-center gap-2 shrink-0">{rightExtra}</div>
            )}

            {/* Tema + Dil + Giriş/Profil — küçük flex gap-2 */}
            <div className="flex items-center gap-2 shrink-0">
              {mounted && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
                  title={isDark ? 'Açık mod' : 'Karanlık mod'}
                  aria-label={isDark ? 'Açık moda geç' : 'Karanlık moda geç'}
                >
                  <span className="text-sm w-4 h-4 inline-flex items-center justify-center leading-none" aria-hidden>
                    {isDark ? '☀️' : '🌙'}
                  </span>
                </button>
              )}
              <div className="relative shrink-0" ref={uiLangDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUiLangDropdownOpen((o) => !o)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-[10px] font-medium uppercase tabular-nums shrink-0"
                  title={t('arayuz_dili')}
                  aria-label={t('dil_secin')}
                  aria-expanded={uiLangDropdownOpen}
                  aria-haspopup="listbox"
                >
                  {['tr', 'en', 'fr', 'es'].includes((i18n.language || 'tr').slice(0, 2))
                    ? (i18n.language || 'tr').slice(0, 2).toUpperCase()
                    : 'TR'}
                </button>
                {uiLangDropdownOpen && (
                  <div
                    role="listbox"
                    aria-label={t('dil_secin')}
                    className="absolute right-0 top-full mt-1.5 w-max min-w-[120px] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 backdrop-blur-md shadow-xl py-1 z-50"
                  >
                    {(['tr', 'en', 'fr', 'es'] as const).map((lng) => (
                      <button
                        key={lng}
                        type="button"
                        role="option"
                        aria-selected={i18n.language === lng}
                        onClick={() => {
                          i18n.changeLanguage(lng);
                          setUiLangDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                          i18n.language === lng
                            ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                        }`}
                      >
                        {t(lng === 'tr' ? 'lang_turkce' : lng === 'en' ? 'lang_english' : lng === 'fr' ? 'lang_francais' : 'lang_espanol')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {resolvedLoggedIn && (
                <>
                  <Link
                    to="/profil"
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
                    title="Profil"
                    aria-label="Profil"
                  >
                    <User className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="h-8 px-2 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0 whitespace-nowrap flex items-center gap-1.5"
                    title="Çıkış"
                    aria-label="Çıkış yap"
                  >
                    <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>Çıkış</span>
                  </button>
                </>
              )}
            </div>

            {/* Giriş Yap — yalnızca oturum açma; hiçbir zaman /pricing veya /login linki değil */}
            {!resolvedLoggedIn && (
              <button
                type="button"
                onClick={(e) => handleLogin(e)}
                aria-label="Oturum aç"
                className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-300/50 dark:border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hidden sm:inline-flex items-center shrink-0 whitespace-nowrap mr-1"
              >
                Giriş Yap
              </button>
            )}

            {/* Pro'ya Geç — Fiyatlandırma sayfasına gider (Giriş Yap ile karıştırılmamalı) */}
            <Link
              to="/pricing"
              className="h-8 px-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 shadow-md shadow-amber-500/25 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17] flex items-center shrink-0 whitespace-nowrap"
            >
              🌟 Pro&apos;ya Geç
            </Link>
          </div>
        </div>
      </header>

      {/* Mobil menü — xl altında; sağdan açılan panel */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-sm xl:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasyon menüsü"
            onClick={closeMobile}
          />
          <div
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-[#0d1117] border-l border-slate-200 dark:border-white/10 shadow-2xl xl:hidden flex flex-col animate-slide-in-right"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasyon menüsü"
          >
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/50 dark:border-white/5 shrink-0">
              <span className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">Menü</span>
              <button
                type="button"
                onClick={closeMobile}
                className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                aria-label="Menüyü kapat"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            <nav className="flex flex-col p-4 gap-1 overflow-y-auto">
              {NAV_LINKS.map(({ to, labelKey, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={closeMobile}
                    className={`w-full py-3 px-4 rounded-xl text-left text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      active
                        ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-200 border border-indigo-400/30'
                        : 'bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/10'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />}
                    {t(labelKey)}
                  </Link>
                );
              })}
              {resolvedLoggedIn && (
                <Link
                  to="/profil"
                  onClick={closeMobile}
                  className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center gap-2 bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <User className="w-4 h-4 shrink-0" strokeWidth={2} />
                  Profil
                </Link>
              )}
              <Link
                to="/pricing"
                onClick={closeMobile}
                className="w-full py-3 px-4 rounded-xl text-left text-sm font-semibold bg-gradient-to-r from-amber-400/90 via-yellow-400/90 to-amber-500/90 text-slate-900 border border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 mt-2"
              >
                🌟 Pro&apos;ya Geç
              </Link>
              {!resolvedLoggedIn && (
                <button
                  type="button"
                  onClick={(e) => {
                    closeMobile();
                    handleLogin(e);
                  }}
                  aria-label="Oturum aç"
                  className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center gap-2 bg-slate-100/80 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 border border-slate-200/50 dark:border-white/10 hover:bg-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mt-2"
                >
                  Giriş Yap
                </button>
              )}
              {resolvedLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    handleLogout();
                  }}
                  className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium flex items-center gap-2 bg-slate-100/80 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mt-2"
                >
                  <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} />
                  Çıkış
                </button>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
