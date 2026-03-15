/**
 * Cümle Laboratuvarı — Karmaşık cümleleri formül gibi öğelerine ayırır.
 * Groq ile sözdizimi analizi, renkli bloklar, hover detay.
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FlaskConical, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import { analyzeSentence, type SentenceAnalysisItem } from '../services/dictionaryApi';

type LangId = 'Fransızca' | 'İspanyolca' | 'İngilizce';

const LANGUAGES: { id: LangId; label: string; flag: string }[] = [
  { id: 'Fransızca', label: 'Fransızca', flag: '🇫🇷' },
  { id: 'İspanyolca', label: 'İspanyolca', flag: '🇪🇸' },
  { id: 'İngilizce', label: 'İngilizce', flag: '🇬🇧' },
];

/** Dil bazlı örnek cümleler — zorlu gramer yapıları */
const EXAMPLE_SENTENCES: Record<LangId, string[]> = {
  Fransızca: [
    "Si j'avais su, je serais venu.",
    "Il faut que tu viennes demain.",
    "Nous aurions aimé rester plus longtemps.",
  ],
  İspanyolca: [
    'Si tuviera dinero, viajaría por todo el mundo.',
    'Ojalá que llueva mañana.',
    'Es posible que haya llegado ya.',
  ],
  İngilizce: [
    'If I had known, I would have come.',
    'It is essential that he be there.',
    'She suggested that we leave early.',
  ],
};

function getBlockClasses(type: string | undefined): string {
  const t = (type || '').toLowerCase();
  if (t.includes('verb')) return 'bg-rose-500/20 text-rose-200 border-rose-500/50';
  if (t.includes('noun')) return 'bg-blue-500/20 text-blue-200 border-blue-500/50';
  if (t.includes('adjective')) return 'bg-amber-500/20 text-amber-200 border-amber-500/50';
  if (t.includes('pronoun')) return 'bg-purple-500/20 text-purple-200 border-purple-500/50';
  return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
}

function WordBlock({ item }: { item: SentenceAnalysisItem }) {
  const [showPopover, setShowPopover] = useState(false);
  const classes = getBlockClasses(item.type);

  return (
    <span
      className={`relative inline-flex rounded-lg border px-3 py-1.5 text-sm font-medium transition-all hover:scale-105 ${classes}`}
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      {item.word}
      {showPopover && (item.base || item.grammarDetails || item.translation) && (
        <div
          className="absolute left-1/2 top-full z-50 mt-2 min-w-[200px] max-w-[280px] -translate-x-1/2 rounded-xl border border-white/20 bg-slate-800/95 p-3 shadow-xl backdrop-blur-sm"
          role="tooltip"
        >
          <div className="space-y-1.5 text-left text-xs">
            {item.base && (
              <p>
                <span className="text-slate-500">Kök/Mastar:</span>{' '}
                <span className="text-slate-200">{item.base}</span>
              </p>
            )}
            {item.grammarDetails && (
              <p>
                <span className="text-slate-500">Dilbilgisi:</span>{' '}
                <span className="text-slate-200">{item.grammarDetails}</span>
              </p>
            )}
            {item.translation && (
              <p>
                <span className="text-slate-500">Çeviri:</span>{' '}
                <span className="text-amber-200">{item.translation}</span>
              </p>
            )}
            {item.type && (
              <p>
                <span className="text-slate-500">Tür:</span>{' '}
                <span className="text-slate-400">{item.type}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

export default function SyntaxLab() {
  const [sentence, setSentence] = useState('');
  const [language, setLanguage] = useState<LangId>('Fransızca');
  const [items, setItems] = useState<SentenceAnalysisItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exampleChips = EXAMPLE_SENTENCES[language];

  const handleAnalyze = async () => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeSentence(trimmed, language);
      setItems(result);
      if (result.length === 0) setError('Analiz sonucu alınamadı. Cümleyi kontrol edip tekrar deneyin.');
    } catch {
      setError('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <Helmet>
        <title>Cümle Laboratuvarı | Diloloji</title>
        <meta name="description" content="Uzun cümleleri formüllere ayırın, dilin iskeletini görün. Sözdizimi analizi." />
      </Helmet>
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 pb-16">
        <header className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2 flex items-center justify-center gap-2">
            <FlaskConical className="w-8 h-8 text-amber-400" strokeWidth={2} aria-hidden />
            Cümle Laboratuvarı
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Uzun cümleleri formüllere ayırın, dilin iskeletini görün
          </p>
        </header>

        <div className="space-y-5">
          {/* Dil seçici — Segmented Control */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Dil
            </label>
            <div
              role="tablist"
              aria-label="Analiz dili seçin"
              className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10"
            >
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setLanguage(lang.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] ${
                      isSelected
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-transparent text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden>{lang.flag}</span>
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metin kutusu — premium input alanı */}
          <div>
            <label htmlFor="syntax-input" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Cümle
            </label>
            <textarea
              id="syntax-input"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="Analiz etmek istediğiniz cümleyi yazın..."
              rows={6}
              className="w-full rounded-xl bg-[#0a0e17]/50 backdrop-blur-sm border border-white/10 px-4 py-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent resize-y min-h-[160px] text-base leading-relaxed transition-shadow duration-200"
            />
          </div>

          {/* Hemen Dene — örnek çipler */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Nasıl çalışır? Şunları test et:
            </p>
            <div className="flex flex-wrap gap-2">
              {exampleChips.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setSentence(example)}
                  className="rounded-full px-3.5 py-1.5 text-sm text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-slate-100 hover:border-indigo-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Sihirli Analiz butonu */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || !sentence.trim()}
            className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {loading ? (
              'Analiz ediliyor...'
            ) : (
              <>
                <Sparkles className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
                Analiz Et
              </>
            )}
          </button>

          {error && (
            <p className="text-rose-400 text-sm text-center" role="alert">
              {error}
            </p>
          )}
        </div>

        {items.length > 0 && (
          <section className="mt-10" aria-label="Analiz sonucu">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Cümlenin iskeleti
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item, i) => (
                <WordBlock key={`${item.word}-${i}`} item={item} />
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Fiil: kırmızı · İsim: mavi · Sıfat: sarı · Zamir: mor · Diğer: gri — Detay için üzerine gelin.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
