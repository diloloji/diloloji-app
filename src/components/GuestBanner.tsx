import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function GuestBanner() {
  const { user, loading } = useAuth();

  if (loading || user || !isSupabaseConfigured) return null;

  return (
    <div
      className="sticky top-0 z-[45] w-full border-b border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-100 backdrop-blur-sm print:hidden"
      role="status"
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span>
          💾 İlerlemeniz kaydedilmiyor — Giriş yapın veya kayıt olun
        </span>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('conjume-open-auth-modal'))}
          className="shrink-0 rounded-lg bg-amber-500/90 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          Giriş Yap
        </button>
      </span>
    </div>
  );
}
