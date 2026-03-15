/**
 * Mobil alt navigasyon çubuğu: Sözlük, Fiil Lab, Ezber, Profil.
 * Sadece md (768px) altında görünür.
 */
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, FlaskConical, Brain, User } from 'lucide-react';

const ITEMS = [
  { to: '/sozluk', label: 'Sözlük', icon: BookOpen },
  { to: '/fiil-laboratuvari', label: 'Fiil Lab', icon: FlaskConical },
  { to: '/ezber-makinesi', label: 'Ezber', icon: Brain },
  { to: '/profil', label: 'Profil', icon: User },
] as const;

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex items-center justify-around h-16 bg-white/90 dark:bg-[#0a0e17]/95 backdrop-blur-md border-t border-slate-200/60 dark:border-white/10 safe-area-pb"
      role="navigation"
      aria-label="Ana sayfalar"
    >
      {ITEMS.map(({ to, label, icon: Icon }) => {
        const isActive = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 rounded-lg transition-colors ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="w-6 h-6" strokeWidth={2} aria-hidden />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
