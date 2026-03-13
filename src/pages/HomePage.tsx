import { Link } from 'react-router-dom';
import { useThemeContext } from '../contexts/ThemeContext';

/** Arka planda sol üst → sağ alt koyu gradyan + sönük matematik/dil sembol katmanı */
function BackgroundWithPattern() {
  return (
    <>
      {/* Koyu gradyan: kobalt mavisi → menekşe (sadece karanlık temada belirgin) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-[#0c1929] dark:via-[#1a1f3a] dark:to-[#1e1b4b] transition-colors duration-300"
        aria-hidden
      />
      {/* Sönük matematik ağı */}
      <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08] pointer-events-none select-none" aria-hidden>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="math-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#math-grid)" className="text-slate-600 dark:text-slate-400" />
        </svg>
      </div>
      {/* Sönük dil/matematik sembolleri (sigma, alfa, pi, entegral) - sayfa geneline dağılmış */}
      <div className="absolute inset-0 pointer-events-none select-none text-slate-500 dark:text-slate-500 opacity-30 dark:opacity-25 text-xl sm:text-2xl blur-[0.5px]" aria-hidden>
        <span className="absolute left-[10%] top-[20%]">σ</span>
        <span className="absolute left-[22%] top-[35%]">α</span>
        <span className="absolute left-[75%] top-[25%]">π</span>
        <span className="absolute left-[85%] top-[45%]">∫</span>
        <span className="absolute left-[15%] top-[60%]">∑</span>
        <span className="absolute left-[70%] top-[70%]">∂</span>
        <span className="absolute left-[5%] top-[80%]">λ</span>
        <span className="absolute right-[12%] top-[75%]">ω</span>
      </div>
    </>
  );
}

/** Kenarlarda kaybolan dil/matematik sembolleri (içerik alanı yanları) */
function EdgeParticles() {
  const symbols = ['σ', 'α', 'π', '∫', '∑', '∂', 'λ', 'ω'];
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
      {/* Sol kenar */}
      <div className="absolute left-0 top-1/4 bottom-1/4 w-16 flex flex-col gap-8 text-slate-400 dark:text-slate-600 opacity-30 dark:opacity-20 text-xl sm:text-2xl">
        {symbols.map((s, i) => (
          <span key={`l-${i}`} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
            {s}
          </span>
        ))}
      </div>
      {/* Sağ kenar */}
      <div className="absolute right-0 top-1/3 bottom-1/3 w-16 flex flex-col gap-8 text-slate-400 dark:text-slate-600 opacity-30 dark:opacity-20 text-xl sm:text-2xl text-right">
        {symbols.slice().reverse().map((s, i) => (
          <span key={`r-${i}`} className="animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isDark, toggleTheme, mounted } = useThemeContext();

  return (
    <div className="min-h-screen relative bg-slate-50 dark:bg-transparent transition-colors duration-300">
      <BackgroundWithPattern />

      <header className="relative z-10 w-full flex justify-between items-center py-3 px-4 sm:px-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/50 sticky top-0 transition-colors duration-300">
        <Link
          to="/"
          className="min-w-0 flex items-center gap-3 shrink-0 transition-all duration-300 hover:opacity-90 hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-lg"
          aria-label="Ana sayfa"
        >
          <img src="/logo.svg" alt="DİLOLOJİ" className="h-9 sm:h-10 w-auto shrink-0" />
          <span className="text-slate-400 dark:text-slate-500 text-sm italic hidden sm:inline shrink-0">
            Dilin matematiğini çöz.
          </span>
        </Link>
        <div className="flex items-center shrink-0">
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100/80 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-slate-900 shrink-0"
              title={isDark ? 'Açık mod' : 'Karanlık mod'}
              aria-label={isDark ? 'Açık moda geç' : 'Karanlık moda geç'}
            >
              <span className="text-base leading-none" aria-hidden>{isDark ? '☀️' : '🌙'}</span>
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-12 sm:py-16 flex flex-col items-center">
        <EdgeParticles />

        <section className="text-center mb-12 sm:mb-16 relative z-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-sky-200 bg-clip-text text-transparent">
            DİLOLOJİ&apos;ye Hoş Geldin! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl max-w-md mx-auto font-medium">
            Dilin matematiğini çözmeye ve pratik yapmaya hemen başla.
          </p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl relative z-10">
          <Link
            to="/fiil-laboratuvari"
            className="group flex flex-col items-center justify-center rounded-2xl border border-teal-500/30 dark:border-teal-400/30 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-8 shadow-lg shadow-teal-500/5 dark:shadow-teal-400/10 transition-all duration-300 hover:scale-[1.03] hover:shadow-teal-500/20 dark:hover:shadow-teal-400/20 hover:border-teal-500/50 dark:hover:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <span className="text-4xl mb-4 block group-hover:animate-icon-sway" aria-hidden>🧪</span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-xl">
              Fiil Laboratuvarı
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Çekim ve alıştırma
            </p>
          </Link>
          <Link
            to="/ezber-makinesi"
            className="group flex flex-col items-center justify-center rounded-2xl border border-teal-500/30 dark:border-teal-400/30 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-8 shadow-lg shadow-teal-500/5 dark:shadow-teal-400/10 transition-all duration-300 hover:scale-[1.03] hover:shadow-teal-500/20 dark:hover:shadow-teal-400/20 hover:border-teal-500/50 dark:hover:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <span className="text-4xl mb-4 block group-hover:animate-icon-glow" aria-hidden>🧠</span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-xl">
              Ezber Makinesi
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Kartlar ve quiz
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
