import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-lg w-full text-center">
        {/* 404 — büyük, hafif glow */}
        <p
          className="text-8xl sm:text-9xl font-black text-slate-200 dark:text-slate-700 tracking-tighter select-none"
          style={{ textShadow: '0 0 40px rgba(99, 102, 241, 0.25)' }}
          aria-hidden
        >
          404
        </p>

        <div className="mt-6 rounded-2xl bg-slate-800/50 dark:bg-slate-900/80 border border-slate-600/50 dark:border-slate-700/80 backdrop-blur-md p-6 sm:p-8 shadow-xl">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Ölü Bir Dil Arıyor Olabilirsiniz…
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            Ya da çekimi olmayan bir fiile denk geldiniz. Aradığınız sayfa dilbilgisi kurallarımızın dışında kalıyor.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center w-full sm:w-auto min-w-[200px] rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-semibold py-3 px-6 shadow-lg shadow-indigo-500/25 dark:shadow-indigo-500/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Laboratuvara Geri Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
