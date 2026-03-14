/**
 * Öğrenme Yolu (Learning Plan) — A1–C1 müfredat yol haritası.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BookOpen, PenLine, MessageCircle } from 'lucide-react';
type Lang = 'fr' | 'es';
type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

type ModuleItem = {
  icon: 'book' | 'pen' | 'message';
  title: string;
  description: string;
};

const ICONS = {
  book: BookOpen,
  pen: PenLine,
  message: MessageCircle,
};

const CURRICULUM: Record<Lang, Record<Level, ModuleItem[]>> = {
  fr: {
    A1: [
      { icon: 'book', title: 'Alfabe ve Telaffuz', description: 'Harfler, sesler ve temel okunuş kuralları.' },
      { icon: 'message', title: 'Tanışma (Salutations)', description: 'Selamlaşma ve kendini tanıtma.' },
      { icon: 'pen', title: 'Şahıs Zamirleri', description: 'Je, tu, il/elle ve çoğul zamirler.' },
      { icon: 'book', title: 'Être & Avoir (Temel)', description: 'En temel iki yardımcı fiil.' },
      { icon: 'pen', title: '1. Grup Fiiller', description: '-er ile biten düzenli fiiller.' },
      { icon: 'book', title: 'Sayılar ve Renkler', description: 'Temel sayılar ve renk sıfatları.' },
    ],
    A2: [
      { icon: 'pen', title: 'Passé Composé (Geçmiş Zaman)', description: 'Yardımcı fiil + geçmiş ortaç.' },
      { icon: 'book', title: 'Imparfait (Hikaye)', description: 'Süreç ve alışkanlık geçmişi.' },
      { icon: 'pen', title: 'Sıfatlar ve Zarflar', description: 'Uyum ve karşılaştırma.' },
      { icon: 'message', title: 'Gelecek Zaman (Futur Proche)', description: 'Aller + mastar ile yakın gelecek.' },
      { icon: 'book', title: 'Ev ve Günlük Yaşam', description: 'Günlük rutin ve ev sözcükleri.' },
    ],
    B1: [
      { icon: 'book', title: 'Subjonctif Giriş', description: 'Dilek ve zorunluluk kipi.' },
      { icon: 'pen', title: 'Conditionnel (Şart Kipi)', description: 'Koşul ve nazik istek.' },
      { icon: 'message', title: 'Dolaylı Anlatım', description: 'Discours indirect ve zaman kayması.' },
      { icon: 'pen', title: 'Karşılaştırmalar', description: 'Plus que, moins que, aussi que.' },
      { icon: 'book', title: 'Medya ve Toplum', description: 'Haber ve sosyal konular.' },
    ],
    B2: [
      { icon: 'book', title: 'İleri Subjonctif', description: 'Subjonctif passé ve nüanslar.' },
      { icon: 'pen', title: 'Gérondif', description: 'En + participe présent.' },
      { icon: 'message', title: 'Mantıksal Bağlaçlar', description: 'Donc, cependant, néanmoins.' },
      { icon: 'pen', title: 'Argumentasyon Teknikleri', description: 'Tez, antitez, örnek.' },
    ],
    C1: [
      { icon: 'book', title: 'Dil Nüansları', description: 'Eş anlamlılar ve register farkları.' },
      { icon: 'pen', title: 'Fransız Edebiyatı', description: 'Metin analizi ve üslup.' },
      { icon: 'pen', title: 'Akademik Yazım', description: 'Makale ve rapor yapısı.' },
      { icon: 'message', title: 'Sosyo-Politik Tartışmalar', description: 'Güncel tartışma ve münazara.' },
    ],
  },
  es: {
    A1: [
      { icon: 'book', title: 'Alfabe', description: 'Harfler ve İspanyolca telaffuz.' },
      { icon: 'message', title: 'Selamlaşmalar', description: 'Hola, buenos días ve vedalar.' },
      { icon: 'pen', title: 'Ser & Estar Farkı', description: 'İki "olmak" fiilinin kullanımı.' },
      { icon: 'book', title: 'Düzenli Fiiller (Presente)', description: '-ar, -er, -ir çekimleri.' },
      { icon: 'pen', title: 'Sayılar', description: 'Temel sayılar ve saat.' },
      { icon: 'message', title: 'Aile ve Hobiler', description: 'Aile üyeleri ve boş zaman.' },
    ],
    A2: [
      { icon: 'pen', title: 'Pretérito Perfecto & Indefinido', description: 'Geçmiş zamanların ayrımı.' },
      { icon: 'book', title: 'Imperfecto', description: 'Süreç ve alışkanlık geçmişi.' },
      { icon: 'message', title: 'Gelecek Zaman', description: 'Futuro simple ve ir a + infinitivo.' },
      { icon: 'pen', title: 'Emir Kipi (Imperativo)', description: 'Olumlu ve olumsuz emirler.' },
      { icon: 'book', title: 'Seyahat ve Sağlık', description: 'Yolculuk ve sağlık sözcükleri.' },
    ],
    B1: [
      { icon: 'book', title: 'Subjuntivo (Giriş)', description: 'Dilek ve olasılık kipi.' },
      { icon: 'pen', title: 'Condicional', description: 'Koşul ve nazik istek.' },
      { icon: 'pen', title: 'Voz Pasiva (Edilgen Çatı)', description: 'Ser + participio.' },
      { icon: 'message', title: 'Dolaylı Anlatım', description: 'Estilo indirecto.' },
      { icon: 'book', title: 'Kültür ve Gelenekler', description: 'İspanyolca dünyası.' },
    ],
    B2: [
      { icon: 'pen', title: 'Por & Para Nüansları', description: 'İki "için" edatının kullanımı.' },
      { icon: 'book', title: 'İleri Subjuntivo Kullanımları', description: 'Subjuntivo en cláusulas.' },
      { icon: 'message', title: 'Bağlaçlar ve Münazara', description: 'Conectores y argumentación.' },
    ],
    C1: [
      { icon: 'book', title: 'Deyimler (Modismos)', description: 'Günlük ifadeler ve argo.' },
      { icon: 'pen', title: 'Edebiyat Analizi', description: 'Metin ve üslup incelemesi.' },
      { icon: 'pen', title: 'Akademik Sunum', description: 'Sunum ve raporlama.' },
      { icon: 'message', title: 'İspanyol Dünyası Güncel Olaylar', description: 'Tartışma ve güncel konular.' },
    ],
  },
};

export default function LearningPath() {
  const [lang, setLang] = useState<Lang>('fr');
  const [level, setLevel] = useState<Level>('A1');

  const modules = CURRICULUM[lang][level];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/20 to-slate-200/80 dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#1e1b4b] transition-colors duration-500">
      <Helmet>
        <title>Öğrenme Yolu | Diloloji</title>
        <meta name="description" content="Fransızca ve İspanyolca A1–C1 müfredat yol haritası." />
      </Helmet>

      <header className="sticky top-0 z-20 w-full flex justify-between items-center py-3 px-4 sm:px-5 bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 shrink-0 transition-all duration-300 hover:opacity-90"
            aria-label="Ana sayfa"
          >
            <img src="/logo.svg" alt="Diloloji" className="h-8 sm:h-10 w-auto" />
            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:hidden">Diloloji</span>
            <span className="text-slate-400 dark:text-slate-500 text-sm italic hidden md:inline">Dilin matematiğini çöz.</span>
          </Link>
          <nav className="ml-2 md:ml-4 hidden md:flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-600 shrink-0" role="tablist">
            <Link to="/fiil-laboratuvari" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Fiil Laboratuvarı</Link>
            <Link to="/ezber-makinesi" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Ezber Makinesi</Link>
            <Link to="/sozluk" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Sözlük</Link>
            <Link to="/ogrenme" className="rounded-lg px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm" aria-current="page">Öğrenme</Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 py-8 pb-24">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Öğrenme Yolu</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">A1’den C1’e adım adım müfredat</p>
        </div>

        {/* Dil seçici — Segmented Control */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-1 p-1 bg-slate-800/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-full shadow-inner" role="tablist" aria-label="Hedef dil">
            <button
              type="button"
              role="tab"
              aria-selected={lang === 'fr'}
              onClick={() => setLang('fr')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer flex items-center gap-2 ${
                lang === 'fr' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span aria-hidden>🇫🇷</span>
              Fransızca
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lang === 'es'}
              onClick={() => setLang('es')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer flex items-center gap-2 ${
                lang === 'es' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span aria-hidden>🇪🇸</span>
              İspanyolca
            </button>
          </div>
        </div>

        {/* Seviye seçici — Segmented Control */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1 p-1 bg-slate-800/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-full shadow-inner" role="tablist" aria-label="Seviye">
            {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                role="tab"
                aria-selected={level === lvl}
                onClick={() => setLevel(lvl)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer ${
                  level === lvl ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Modül kartları — Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod, i) => {
            const Icon = ICONS[mod.icon];
            return (
              <button
                key={`${mod.title}-${i}`}
                type="button"
                className="bg-slate-800/40 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 hover:border-indigo-500/50 transition-all cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <div className="flex flex-col gap-3">
                  <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-indigo-500/20 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200">
                    <Icon className="w-5 h-5" strokeWidth={2} aria-hidden />
                  </span>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">{mod.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{mod.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
