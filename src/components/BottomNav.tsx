/**
 * Mobil alt navigasyon çubuğu: Sözlük, Fiil Lab, Ezber, Profil.
 * Sadece md (768px) altında görünür.
 */
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, FlaskConical, Brain, User } from 'lucide-react';

const ITEMS = [
  { to: '/sozluk', labelKey: 'bottomNav.dictionary' as const, icon: BookOpen },
  { to: '/fiil-laboratuvari', labelKey: 'bottomNav.verbLab' as const, icon: FlaskConical },
  { to: '/ezber-makinesi', labelKey: 'bottomNav.memorizer' as const, icon: Brain },
  { to: '/profil', labelKey: 'bottomNav.profile' as const, icon: User },
] as const;

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex items-center justify-around min-h-16 h-auto py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] bg-white/90 dark:bg-[#0a0e17]/95 backdrop-blur-md border-t border-slate-200/60 dark:border-white/10"
      role="navigation"
      aria-label={t('bottomNav.aria')}
    >
      {ITEMS.map(({ to, labelKey, icon: Icon }) => {
        const isActive =
          location.pathname === to || (to === '/fiil-laboratuvari' && location.pathname === '/');
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] min-h-[48px] py-2 rounded-lg transition-colors touch-manipulation ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="w-6 h-6" strokeWidth={2} aria-hidden />
            <span className="text-[10px] font-medium">{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
