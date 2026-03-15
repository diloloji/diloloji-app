/**
 * Navbar — Üçlü kesin blok: Sol (Logo), Orta (Linkler), Sağ (İstatistikler + Butonlar).
 * Flexbox ile overlap önlenir; absolute konumlandırma yok.
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookA, BookOpen, Brain, Star, Flame, FlaskConical, User, Trophy } from 'lucide-react';
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
  /** Giriş yapıldığında sağ tarafta gösterilecek alan (puan, beyin, yıldız vb.). Gösterilmezse Giriş Yap butonu görünür (onLoginClick varsa). */
  rightExtra?: React.ReactNode;
  /** Giriş yapılmamışken Giriş Yap butonuna tıklanınca çağrılır (örn. auth modal aç). */
  onLoginClick?: () => void;
  /** true ise rightExtra gösterilir ve Giriş Yap butonu gizlenir. */
  isLoggedIn?: boolean;
  /** Yazdırma sayfalarında navbar gizlensin (data-print-hide). */
  printHide?: boolean;
};

export default function Navbar({ rightExtra, onLoginClick, isLoggedIn, printHide }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { isDark, toggleTheme, mounted } = useThemeContext();
  const { totalXP, level, streak } = useXp();
  const [uiLangDropdownOpen, setUiLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const uiLangDropdownRef = useRef<HTMLDivElement>(null);

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

  const closeMobile = () => setMobileMenuOpen(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header
        data-print-hide={printHide ? true : undefined}
        className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#0a0e17]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 transition-all duration-300 print:hidden"
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between w-full h-14">
          {/* Blok 1 — Sol: Logo */}
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

          {/* Blok 2 — Orta: Linkler (flex-1, absolute yok) */}
          <div className="flex-1 flex justify-center items-center min-w-0 overflow-x-auto overflow-y-hidden mx-2">
            <nav
              className="hidden md:flex items-center gap-2 lg:gap-4 flex-shrink-0"
              role="navigation"
              aria-label="Ana menü"
            >
              {NAV_LINKS.map(({ to, labelKey, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`relative rounded-lg px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17] flex items-center gap-1.5 shrink-0 ${
                      active
                        ? 'text-indigo-600 dark:text-white'
                        : 'text-gray-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />}
                    {t(labelKey)}
                    {active && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400"
                        aria-hidden
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Blok 3 — Sağ: İstatistikler + Tema/Dil + Butonlar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            {/* İstatistik grubu */}
            <div
              className="hidden sm:flex items-center gap-2 text-slate-500 dark:text-slate-400 shrink-0"
              aria-live="polite"
            >
              <span className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium tabular-nums whitespace-nowrap" title="Günlük seri">
                <span
                  className={`inline-flex shrink-0 ${streak >= 1 ? 'text-amber-500 dark:text-amber-400 animate-pulse' : 'opacity-50 grayscale'}`}
                  aria-hidden
                >
                  🔥
                </span>
                <span className="tabular-nums">{streak} gün</span>
              </span>
              <span className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium tabular-nums whitespace-nowrap shrink-0" title="Toplam XP">
                <Brain className="w-4 h-4 shrink-0 text-amber-500/90 dark:text-amber-400/90" strokeWidth={2} aria-hidden />
                {totalXP}
              </span>
              <span className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium tabular-nums whitespace-nowrap shrink-0" title="Seviye">
                <Star className="w-4 h-4 shrink-0 text-amber-500/90 dark:text-amber-400/90" strokeWidth={2} aria-hidden />
                Lvl {level}
              </span>
              <Link
                to="/profil"
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors shrink-0 whitespace-nowrap"
                title="Profil"
              >
                <User className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                Profil
              </Link>
            </div>
            {isLoggedIn && rightExtra && (
              <div className="hidden md:flex items-center gap-2 shrink-0">{rightExtra}</div>
            )}
            {/* Tema + Dil */}
            <div className="flex items-center gap-1 shrink-0">
              {mounted && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
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
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-[10px] font-medium uppercase tabular-nums shrink-0"
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
            </div>
            {/* Giriş Yap + Pro'ya Geç */}
            {!isLoggedIn && (
              onLoginClick ? (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-white hover:bg-white/10 border border-slate-300/50 dark:border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hidden sm:inline-flex items-center shrink-0 whitespace-nowrap"
                >
                  Giriş Yap
                </button>
              ) : (
                <Link
                  to="/pricing"
                  className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-white hover:bg-white/10 border border-slate-300/50 dark:border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hidden sm:inline-flex items-center shrink-0 whitespace-nowrap"
                >
                  Giriş Yap
                </Link>
              )
            )}
            <Link
              to="/pricing"
              className="h-8 px-3 sm:px-4 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 shadow-md shadow-amber-500/25 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17] flex items-center shrink-0 whitespace-nowrap"
            >
              🌟 Pro&apos;ya Geç
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            >
              <span className="text-lg leading-none" aria-hidden>☰</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobil menü */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-14 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md md:hidden animate-menu-in"
          role="dialog"
          aria-modal="true"
          aria-label="Navigasyon menüsü"
          onClick={closeMobile}
        >
          <nav className="flex flex-col p-4 pt-6 gap-1 max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            {NAV_LINKS.map(({ to, labelKey, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className={`w-full py-3 px-4 rounded-xl text-left text-base font-medium flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    active
                      ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-200 border border-indigo-400/30'
                      : 'bg-slate-800/60 dark:bg-slate-800/80 text-slate-200 dark:text-slate-100 hover:bg-slate-700/60 border border-slate-600/50'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />}
                  {t(labelKey)}
                </Link>
              );
            })}
            <Link
              to="/profil"
              onClick={closeMobile}
              className="w-full py-3 px-4 rounded-xl text-left text-base font-medium flex items-center gap-2 bg-slate-800/60 dark:bg-slate-800/80 text-slate-200 dark:text-slate-100 hover:bg-slate-700/60 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <User className="w-4 h-4 shrink-0" strokeWidth={2} />
              Profil
            </Link>
            <Link
              to="/pricing"
              onClick={closeMobile}
              className="w-full py-3 px-4 rounded-xl text-left text-base font-semibold bg-gradient-to-r from-amber-400/90 via-yellow-400/90 to-amber-500/90 text-slate-900 border border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 mt-2"
            >
              🌟 Pro&apos;ya Geç
            </Link>
            {!isLoggedIn && onLoginClick && (
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  onLoginClick();
                }}
                className="w-full py-3 px-4 rounded-xl text-left text-base font-medium bg-slate-800/60 dark:bg-slate-800/80 text-indigo-300 border border-slate-600/50 hover:bg-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mt-2"
              >
                Giriş Yap
              </button>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
