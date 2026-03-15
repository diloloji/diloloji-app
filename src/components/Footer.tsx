/**
 * Footer — Kategorize edilmiş linkler, logo, sosyal medya ve telif.
 * 3 sütun: Araçlar, Öğrenme Deneyimi, Hesap & Destek. Mobilde alt alta.
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

type FooterLink = { to: string; label: string; external?: boolean };

const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Araçlar',
    links: [
      { to: '/sozluk', label: 'Sözlük' },
      { to: '/fiil-laboratuvari', label: 'Fiil Laboratuvarı' },
      { to: '/syntax-lab', label: 'Cümle Laboratuvarı' },
      { to: '/ezber-makinesi', label: 'Ezber Makinesi' },
    ],
  },
  {
    title: 'Öğrenme Deneyimi',
    links: [
      { to: '/ogrenme', label: 'Öğrenme Yolu' },
      { to: '/simulator', label: 'AI Simülatörü (Roleplay)' },
      { to: '/sozluk', label: 'Kelime Matrisi' },
    ],
  },
  {
    title: 'Hesap & Destek',
    links: [
      { to: '/profil', label: 'Profilim' },
      { to: '/profil', label: 'Başarılarım (XP / Seri)' },
      { to: '/pricing', label: 'Fiyatlandırma (Pro)' },
      { to: 'mailto:destek@diloloji.com', label: 'İletişim', external: true },
    ],
  },
];

const SOCIAL_LINKS = [
  { href: 'https://twitter.com', label: 'X (Twitter)', icon: 'x' },
  { href: 'https://github.com', label: 'GitHub', icon: 'github' },
  { href: 'https://linkedin.com', label: 'LinkedIn', icon: 'linkedin' },
] as const;

function SocialIcon({ icon }: { icon: string }) {
  if (icon === 'x') {
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (icon === 'github') {
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    );
  }
  if (icon === 'linkedin') {
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    );
  }
  return null;
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mt-24 pt-14 pb-10 border-t border-white/10 dark:border-white/10"
    >
      <div className="glass-panel-strong p-8 sm:p-10 lg:p-12">
        {/* Üst: Logo + Slogan + Sosyal | 3 sütun link */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 lg:gap-10">
          {/* Sütun 0: Logo, slogan, sosyal medya — simetrik */}
          <div className="flex flex-col items-start md:items-start">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.svg" alt="Diloloji" className="h-8 w-auto" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm italic mb-5">Dilin matematiğini çöz.</p>
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map(({ href, label, icon }) => (
                <a
                  key={icon}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors duration-200"
                  aria-label={label}
                >
                  <SocialIcon icon={icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Sütun 1–3: Kategorize linkler */}
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} className="flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((item) => {
                  const isExternal = item.external === true;
                  const href = item.to;
                  return (
                    <li key={href + item.label}>
                      {isExternal ? (
                        <a
                          href={href}
                          className="text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          to={href}
                          className="text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        {/* E-posta aboneliği */}
        <div className="mt-12 pt-10 border-t border-white/10 dark:border-white/10 flex flex-col items-center text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Gelişmelerden haberdar olun.</p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-2 w-full max-w-md"
          >
            <input
              type="email"
              placeholder="E-posta adresiniz..."
              aria-label="E-posta adresi"
              className="flex-1 min-w-0 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-colors"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl px-5 py-3 text-sm font-semibold bg-white/60 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 backdrop-blur-sm text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              Abone Ol
            </button>
          </form>
        </div>

        {/* Hakkımızda / İletişim — ferah */}
        <div className="mt-10 pt-8 border-t border-white/10 dark:border-white/10 flex flex-col sm:flex-row flex-wrap items-start justify-between gap-6 text-sm text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">Hakkımızda</span>
            <p className="mt-1 max-w-md">Diloloji, dilin mantığını formüllerle öğreten bir platformdur. Ezber yerine kuralları keşfedin.</p>
          </div>
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">İletişim</span>
            <p className="mt-1">destek@diloloji.com</p>
          </div>
        </div>

        {/* Telif — artırılmış padding */}
        <p className="mt-8 pt-8 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-white/10 dark:border-white/10">
          © {year} Diloloji. Tüm hakları saklıdır.
        </p>
      </div>
    </motion.footer>
  );
}
