/**
 * Giriş modalı — minimalist, Firebase Auth için hazır.
 * Mock auth: Giriş Yap / Google ile Devam Et → onLoginSuccess + kapat.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
};

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleGoogleClick = () => {
    // TODO: Firebase Auth will be implemented here (e.g. signInWithPopup(auth, googleProvider))
    onLoginSuccess();
    onClose();
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Firebase Auth will be implemented here (signInWithEmailAndPassword / createUserWithEmailAndPassword)
    onLoginSuccess();
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0a0e17]/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            aria-label="Giriş yap"
            onClick={handleOverlayClick}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-2xl bg-[#0a0e17]/90 backdrop-blur-md border border-white/15 shadow-2xl shadow-black/40 ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* İnce parlayan üst çizgi */}
              <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

              <div className="p-6 sm:p-8">
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>

                <h2
                  id="login-modal-title"
                  className="text-xl font-semibold text-slate-100 text-center mb-6 pr-8"
                >
                  Diloloji&apos;ye Hoş Geldiniz
                </h2>

                {/* Google ile Devam Et */}
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] focus:border-amber-500/30 mb-5"
                  aria-label="Google ile devam et"
                >
                  <GoogleIcon />
                  Google ile Devam Et
                </button>

                {/* Veya e-posta ile */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-[#0a0e17] text-slate-500">Veya e-posta ile</span>
                  </div>
                </div>

                <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="login-email" className="sr-only">
                      E-posta
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-posta"
                      autoComplete="email"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 focus:bg-white/[0.07] transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="login-password" className="sr-only">
                      Şifre
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Şifre"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 focus:bg-white/[0.07] transition-all duration-200"
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      className="flex-1 rounded-xl py-3 px-4 bg-amber-500/90 hover:bg-amber-400 text-slate-900 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17]"
                    >
                      {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                      className="flex-1 rounded-xl py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17]"
                    >
                      {mode === 'login' ? 'Kayıt Ol' : 'Giriş Yap'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
