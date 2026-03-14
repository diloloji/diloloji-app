import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

type ErrorPageProps = {
  title?: string;
  message?: string;
  errorCode?: string;
  onReset?: () => void;
  showCopyButton?: boolean;
  /** Bölüm içinde kompakt kart olarak göster (tam sayfa değil). */
  inline?: boolean;
};

const DEFAULT_TITLE = 'Matematiksel Hata';
const DEFAULT_MESSAGE = 'Görünüşe göre bu fiil denklemi bir hataya yol açtı. Dilin matematiğinde bazen bilinmeyenler çıkar.';

export default function ErrorPage({
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  errorCode = '',
  onReset,
  showCopyButton = true,
  inline = false,
}: ErrorPageProps) {
  const handleCopyCode = () => {
    const text = errorCode || `Hata-${Date.now()}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const card = (
    <motion.div
      animate={{ x: [0, -4, 4, -3, 3, 0] }}
      transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
      className="rounded-3xl border border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-indigo-500/10 dark:shadow-[0_0_60px_rgba(99,102,241,0.15)]"
    >
          {/* Yarım integral (∫) animasyonu */}
          <motion.div
            className="text-6xl sm:text-7xl font-light text-indigo-400/80 dark:text-indigo-400/90 mb-6 text-center"
            animate={{ opacity: [0.6, 1, 0.6], y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            ∫
          </motion.div>

          <h1 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">
            {title}
          </h1>
          <p className="text-slate-400 dark:text-slate-400 text-sm sm:text-base text-center leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onReset ? (
              <button
                type="button"
                onClick={onReset}
                className="rounded-xl border border-indigo-500/50 bg-indigo-500/20 dark:bg-indigo-500/20 text-indigo-200 dark:text-indigo-200 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-500/30 dark:hover:bg-indigo-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
              >
                Denklemi Sıfırla (Ana Sayfaya Dön)
              </button>
            ) : (
              <Link
                to="/"
                className="rounded-xl border border-indigo-500/50 bg-indigo-500/20 dark:bg-indigo-500/20 text-indigo-200 dark:text-indigo-200 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-500/30 dark:hover:bg-indigo-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a] text-center"
              >
                Ana Sayfaya Dön
              </Link>
            )}
            {showCopyButton && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="rounded-xl border border-slate-500/50 bg-slate-500/10 text-slate-300 dark:text-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
              >
                Hata Kodunu Kopyala
              </button>
            )}
          </div>

          {errorCode && (
            <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500 font-mono truncate max-w-full px-2" title={errorCode}>
              {errorCode}
            </p>
          )}
    </motion.div>
  );

  if (inline) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-auto py-12 px-4"
      >
        {card}
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e1b4b] dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#1e1b4b]">
      {/* Grid arka plan */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" aria-hidden>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="error-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#error-grid)" className="text-white" />
        </svg>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {card}
      </motion.div>
    </div>
  );
}
