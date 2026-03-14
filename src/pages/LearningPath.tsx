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
      { icon: 'book', title: 'Tanımlıklar (Les Articles)', description: 'Le, la, un, une, du, de la — isimlerin önünde doğru seçim. İlk adımda güven kazanın.' },
      { icon: 'pen', title: 'Olumsuzluk Yapısı (La Négation)', description: 'Ne... pas ile olumsuz cümle kurma. Basit kurallarla her cümleyi olumsuzlaştırın.' },
      { icon: 'message', title: 'Soru Sorma Teknikleri', description: 'Est-ce que, inversion ve soru sözcükleri. Doğal ve anlaşılır sorular sorun.' },
      { icon: 'pen', title: 'İyelik Sıfatları (Adjectifs Possessifs)', description: 'Mon, ton, son ve cinsiyet–çoğul uyumu. Sahiplik ifadesini sağlam atın.' },
      { icon: 'book', title: 'Être & Avoir (Temel)', description: 'En temel iki yardımcı fiil.' },
      { icon: 'pen', title: '1. Grup Fiiller', description: '-er ile biten düzenli fiiller.' },
      { icon: 'book', title: 'Sayılar ve Renkler', description: 'Temel sayılar ve renk sıfatları.' },
    ],
    A2: [
      { icon: 'pen', title: 'Passé Composé (Geçmiş Zaman)', description: 'Yardımcı fiil + geçmiş ortaç.' },
      { icon: 'book', title: 'Imparfait (Hikaye)', description: 'Süreç ve alışkanlık geçmişi.' },
      { icon: 'message', title: 'Dönüşlü Fiiller (Verbes Réfléchis)', description: 'Se laver, se réveiller — günlük rutinleri anlatın. Zamir kullanımını otomatikleştirin.' },
      { icon: 'pen', title: 'Nesne Zamirleri (COD & COI)', description: 'Le, la, lui, leur ile kelime tekrarını önleyin. Cümleleriniz akıcılaşsın.' },
      { icon: 'pen', title: 'Karşılaştırma Yapıları', description: 'Plus que, moins que, aussi que ile kıyaslama. “Daha …”, “kadar” ifadelerine hakim olun.' },
      { icon: 'message', title: 'Kafe ve Restoran Pratiği', description: 'Sipariş verme, hesap isteme ve nezaket kuralları. Gerçek ortamlara hazırlanın.' },
      { icon: 'pen', title: 'Sıfatlar ve Zarflar', description: 'Uyum ve karşılaştırma.' },
      { icon: 'book', title: 'Gelecek Zaman (Futur Proche)', description: 'Aller + mastar ile yakın gelecek.' },
      { icon: 'book', title: 'Ev ve Günlük Yaşam', description: 'Günlük rutin ve ev sözcükleri.' },
    ],
    B1: [
      { icon: 'book', title: 'Subjonctif Giriş', description: 'Dilek ve zorunluluk kipi.' },
      { icon: 'pen', title: 'Conditionnel (Şart Kipi)', description: 'Koşul ve nazik istek.' },
      { icon: 'book', title: 'Gelecek Zaman Farkları', description: 'Futur proche (yakın) vs. futur simple (uzak). Hangi geleceği ne zaman kullanacağınızı netleştirin.' },
      { icon: 'pen', title: "Zamirler 'Y' ve 'En'", description: "Fransızcanın en karakteristik zamirleri. Yer ve miktar ifadesini kısa ve doğal yapın." },
      { icon: 'pen', title: 'Edilgen Çatı (Voix Passive)', description: 'Olaylara ve nesnelere odaklanan anlatım. Haber ve metinleri rahatça okuyun.' },
      { icon: 'message', title: 'Duygu ve Görüş Belirtme', description: 'İnanç, şüphe ve korku ifade eden yapılar. Düşüncenizi net aktarın.' },
      { icon: 'message', title: 'Dolaylı Anlatım', description: 'Discours indirect ve zaman kayması.' },
      { icon: 'book', title: 'Medya ve Toplum', description: 'Haber ve sosyal konular.' },
    ],
    B2: [
      { icon: 'book', title: 'İleri Subjonctif', description: 'Subjonctif passé ve nüanslar.' },
      { icon: 'pen', title: 'Şartlı Cümleler (Si...)', description: 'Si + imparfait + conditionnel ile varsayımlar ve hayali durumlar. “Eğer … olsaydı”ya hakim olun.' },
      { icon: 'pen', title: 'İlgi Zamirleri (Pronoms Relatifs)', description: 'Dont, lequel, auquel — karmaşık bağlaçlarla cümleleri birleştirin ve metin üretin.' },
      { icon: 'message', title: "Modern Argo ve Sokak Dili (L'argot)", description: "Güncel Fransızca, kısaltmalar ve Verlan. Günlük konuşmaya yaklaşın." },
      { icon: 'pen', title: 'Resmi Yazışma Kuralları', description: 'Fransız bürokrasisinde e-posta ve mektup. İş ve resmi başvurulara hazırlanın.' },
      { icon: 'pen', title: 'Gérondif', description: 'En + participe présent.' },
      { icon: 'message', title: 'Mantıksal Bağlaçlar', description: 'Donc, cependant, néanmoins.' },
      { icon: 'pen', title: 'Argumentasyon Teknikleri', description: 'Tez, antitez, örnek.' },
    ],
    C1: [
      { icon: 'pen', title: 'Söylem Belirteçleri (Connecteurs Logiques)', description: 'Akademik tez ve makalelerde ileri seviye bağlaçlar. Savunmanızı net ve ikna edici kılın.' },
      { icon: 'book', title: 'Edebi Zamanlar (Passé Simple)', description: 'Roman ve tarihî metinlerde karşılaşılan zamanlar. Klasik metinleri analiz edin.' },
      { icon: 'book', title: 'Bilimsel ve Politik Terminoloji', description: 'Güncel makale ve haberleri analiz etme. Uzman diline yaklaşın.' },
      { icon: 'message', title: 'Deyimsel İfadeler ve Nüanslar', description: 'Kelime anlamının ötesindeki kültürel deyimler. Konuşmayı incelikle zenginleştirin.' },
      { icon: 'book', title: 'Dil Nüansları', description: 'Eş anlamlılar ve register farkları.' },
      { icon: 'pen', title: 'Fransız Edebiyatı', description: 'Metin analizi ve üslup.' },
      { icon: 'pen', title: 'Akademik Yazım', description: 'Makale ve rapor yapısı.' },
      { icon: 'message', title: 'Sosyo-Politik Tartışmalar', description: 'Güncel tartışma ve münazara.' },
    ],
  },
  es: {
    A1: [
      { icon: 'book', title: 'Alfabe ve Telaffuz', description: 'Harfler, ñ ve vurgu kuralları. İspanyolca sesleri kulağa yerleştirin.' },
      { icon: 'message', title: 'Selamlaşmalar', description: 'Hola, buenos días ve vedalar. İlk teması doğal kılın.' },
      { icon: 'pen', title: 'Ser & Estar Farkı (Derinlemesine)', description: 'Kalıcı ve geçici durumlar — İspanyolcanın en temel ayrımı. “Olmak”ın iki yüzünü netleştirin.' },
      { icon: 'book', title: 'Tanımlıklar ve Cinsiyet (Género y Número)', description: 'El, la, los, las ve isimlerin cinsiyet kuralları. Doğru tanımlık seçiminin matematiği.' },
      { icon: 'pen', title: 'Hay vs. Estar', description: "Bir şeyin varlığını belirtme (hay) ile konumunu gösterme (estar). “Var” mı, “orada” mı — farkı yakalayın." },
      { icon: 'message', title: 'Soru Sorma ve Olumsuzluk', description: 'Temel soru yapıları ve cümleleri olumsuz yapma. Soru kelimeleri ve no / nunca ile güven kazanın.' },
      { icon: 'book', title: 'Düzenli Fiiller (Presente)', description: '-ar, -er, -ir çekimleri. Fiil matrisinin ilk adımı.' },
      { icon: 'pen', title: 'Sayılar ve Günlük İfadeler', description: 'Temel sayılar, saat ve günlük kalıplar.' },
    ],
    A2: [
      { icon: 'message', title: 'Dönüşlü Fiiller (Verbos Reflexivos)', description: 'Levantarse, ducharse — günlük rutinleri anlatın. –se’nin cümle içindeki yerini keşfedin.' },
      { icon: 'pen', title: 'Nesne Zamirleri (Directo & Indirecto)', description: "Lo, la, le zamirlerinin cümle içindeki matematiği. Tekrarları kaldırın, cümleleri sadeleştirin." },
      { icon: 'pen', title: 'Pretérito Perfecto vs. Indefinido', description: 'Tamamlanmış geçmiş zamanlar arasındaki kullanım farkları. Hangi geçmişi ne zaman kullanacağınızı netleştirin.' },
      { icon: 'book', title: 'Yer Edatları ve Yönler', description: 'İspanyol şehirlerinde yol bulma ve konum belirtme. A la derecha, al lado de — sokak diline girin.' },
      { icon: 'book', title: 'Imperfecto', description: 'Süreç ve alışkanlık geçmişi. Hikaye anlatımının temeli.' },
      { icon: 'pen', title: 'Emir Kipi (Imperativo)', description: 'Olumlu ve olumsuz emirler. Rica ve talep ifadeleri.' },
      { icon: 'message', title: 'Seyahat ve Sağlık', description: 'Yolculuk ve sağlık sözcükleri. Seyahatte ihtiyaç duyacağınız kalıplar.' },
    ],
    B1: [
      { icon: 'book', title: "Subjuntivo'ya Giriş", description: 'Dilek, istek ve olasılık dünyasına ilk adım. Ojalá, quizás — ruhu yakalayın.' },
      { icon: 'pen', title: 'Por vs. Para', description: "En çok takıldığınız iki edatın net kuralları. “İçin”ün iki yüzünü matematikselleştirin." },
      { icon: 'message', title: 'Gelecek Zaman (Futuro Simple)', description: 'Planlar ve tahminler yapma. İrá, estarán — geleceği ifade etmenin doğal yolları.' },
      { icon: 'book', title: 'Kültür ve Gelenekler', description: 'İspanyol dünyasındaki bayramlar, yemekler ve sosyal alışkanlıklar. Dili kültürle taşıyın.' },
      { icon: 'pen', title: 'Condicional', description: 'Koşul ve nazik istek. “Olsaydı” ve kibarca rica.' },
      { icon: 'message', title: 'Dolaylı Anlatım (Estilo Indirecto)', description: 'Başkasının sözünü aktarma ve zaman kayması.' },
    ],
    B2: [
      { icon: 'book', title: 'İleri Subjuntivo', description: 'Şartlı yapılar ve concesivas (aunque + subjuntivo). Karmaşık cümleleri rahatça kurun.' },
      { icon: 'pen', title: 'Deyimsel Fiiller (Perífrasis Verbales)', description: "Ir a, estar + gerundio ötesindeki yapılar. Acabar de, echar a — doğal ifade repertuarınızı genişletin." },
      { icon: 'message', title: 'Kastilya vs. Latin Amerika', description: 'İspanya İspanyolcası ile Amerika kıtasındaki dilsel farklar ve nüanslar. Hangi varyantı nerede duyacağınızı bilin.' },
      { icon: 'pen', title: 'Tartışma ve Argüman', description: 'Bir fikri savunma ve karşı tez sunma kalıpları. En mi opinión, por un lado — ikna edici konuşun.' },
      { icon: 'pen', title: 'Por & Para Nüansları', description: 'İki “için” edatının B2 derinliğinde kullanımı.' },
      { icon: 'message', title: 'Bağlaçlar ve Münazara', description: 'Conectores ve argumentación. Akışkan metin ve konuşma.' },
    ],
    C1: [
      { icon: 'book', title: 'Deyimler ve Atasözleri (Modismos)', description: 'Günlük dildeki kültürel derinliği yansıtan kalıplar. Sözcük anlamının ötesine geçin.' },
      { icon: 'pen', title: 'Edebiyat Analizi', description: 'Modern ve klasik İspanyol edebiyatı metinlerini inceleme. Üslup, tema ve bağlam.' },
      { icon: 'pen', title: 'Akademik Yazım ve Sunum', description: 'Resmi raporlar, makaleler ve sunum teknikleri. İş ve akademi diline tam geçiş.' },
      { icon: 'message', title: 'Sosyopolitik Tartışmalar', description: 'İspanyol dünyasındaki güncel olayları analiz etme yetkinliği. Tartışmayı yürütün.' },
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

      <header className="sticky top-0 z-20 w-full flex justify-between items-center py-3 px-4 sm:px-5 bg-transparent dark:bg-transparent backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/50 transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0 transition-all duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-lg" aria-label="Ana sayfa">
            <img src="/logo.svg" alt="Diloloji" className="h-8 sm:h-10 w-auto" />
            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:hidden">Diloloji</span>
            <span className="text-slate-400 dark:text-slate-500 text-xs italic hidden md:inline opacity-60">Dilin matematiğini çöz.</span>
          </Link>
          <nav className="ml-4 md:ml-6 hidden md:flex items-center gap-0.5" role="tablist">
            <Link to="/fiil-laboratuvari" className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300">Fiil Laboratuvarı</Link>
            <Link to="/ezber-makinesi" className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300">Ezber Makinesi</Link>
            <Link to="/sozluk" className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300">Sözlük</Link>
            <Link to="/ogrenme" className="relative rounded-lg px-3 py-2 text-sm font-medium text-indigo-500 dark:text-indigo-400 transition-all duration-300" aria-current="page">
              Öğrenme
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400" aria-hidden />
            </Link>
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
