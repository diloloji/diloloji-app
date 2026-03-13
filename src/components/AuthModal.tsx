import { useState } from 'react';

type AuthMode = 'login' | 'register';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (email: string, password: string) => void;
  onRegister?: (email: string, password: string) => void;
};

export default function AuthModal({ isOpen, onClose, onLogin, onRegister }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      onLogin?.(email, password);
      onClose();
    } else {
      if (password !== confirmPassword) return;
      onRegister?.(email, password);
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      aria-label="Giriş veya kayıt"
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-slate-800/95 dark:bg-slate-900/95 border border-slate-600/50 dark:border-indigo-500/30 shadow-xl shadow-slate-900/30 backdrop-blur-md transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <h2 id="auth-modal-title" className="text-xl font-bold text-slate-100 text-center mb-6">
            {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </h2>

          {/* Google ile Giriş */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 bg-white/10 dark:bg-slate-700/80 hover:bg-white/15 dark:hover:bg-slate-600/80 border border-slate-500/50 dark:border-slate-500/50 text-slate-200 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 mb-5"
            aria-label="Google ile giriş yap"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google ile Giriş Yap
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600/60 dark:border-indigo-500/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-slate-800 dark:bg-slate-900 text-slate-400">veya</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                E-posta
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="w-full rounded-xl bg-slate-700/50 dark:bg-slate-800/80 border border-slate-600/60 dark:border-indigo-500/30 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Şifre
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-700/50 dark:bg-slate-800/80 border border-slate-600/60 dark:border-indigo-500/30 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Şifre (tekrar)
                </label>
                <input
                  id="auth-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-700/50 dark:bg-slate-800/80 border border-slate-600/60 dark:border-indigo-500/30 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="mt-1 w-full rounded-xl py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-semibold shadow-lg shadow-indigo-500/25 dark:shadow-indigo-500/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
            {mode === 'login' ? (
              <>
                Hesabın yok mu?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none focus:underline"
                >
                  Kayıt Ol
                </button>
              </>
            ) : (
              <>
                Zaten hesabın var mı?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none focus:underline"
                >
                  Giriş Yap
                </button>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
          aria-label="Kapat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
