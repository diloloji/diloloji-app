/**
 * Öğrenme Yolu (Learning Plan) — A1–C1 müfredat yol haritası.
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BookOpen, PenLine, MessageCircle, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import LessonView from '../components/LessonView';
import { getUnitContent } from '../data/learningPathUnits';
import type { UnitContent, LessonItem } from '../data/learningPathUnits';

type Lang = 'fr' | 'es' | 'en' | 'de';
type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

type ModuleItem = {
  icon: 'book' | 'pen' | 'message';
  title: string;
  description: string;
  /** Varsa tıklanınca bu ünite detayı açılır */
  unitId?: string;
};

const ICONS = {
  book: BookOpen,
  pen: PenLine,
  message: MessageCircle,
};

const CURRICULUM: Record<Lang, Record<Level, ModuleItem[]>> = {
  fr: {
    A1: [
      { icon: 'book', title: 'Ünite 1: Temel Tanışma ve Être Fiili', description: 'Özne zamirleri, être fiili ve kendini tanıtma. İlk adım.', unitId: 'fr_a1_1_u1' },
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
  en: {
    A1: [
      { icon: 'book', title: 'Ünite 1: Temel Tanışma ve To Be Fiili', description: 'Özne zamirleri (I, you, he/she/it), am/is/are formülü ve günlük selamlaşmalar. İngilizcenin matematiği.', unitId: 'en_a1_1_u1' },
      { icon: 'book', title: 'Alfabe ve Telaffuz', description: 'Harfler, sesler ve vurgu. İngilizce dinleme-alıştırma.' },
      { icon: 'pen', title: 'Articles (a, an, the)', description: 'Belirsiz ve belirli tanımlık. Tekil/çoğul isimler.' },
      { icon: 'message', title: 'Günlük İfadeler', description: 'Thank you, Please, Sorry ve sık kullanılan kalıplar.' },
    ],
    A2: [{ icon: 'book', title: 'Yakında', description: 'İngilizce A2 müfredatı üzerinde çalışıyoruz.' }],
    B1: [{ icon: 'book', title: 'Yakında', description: 'İngilizce B1 müfredatı üzerinde çalışıyoruz.' }],
    B2: [{ icon: 'book', title: 'Yakında', description: 'İngilizce B2 müfredatı üzerinde çalışıyoruz.' }],
    C1: [{ icon: 'book', title: 'Yakında', description: 'İngilizce C1 müfredatı üzerinde çalışıyoruz.' }],
  },
  de: {
    A1: [
      { icon: 'book', title: 'Ünite 1: Tanışma ve Sein (Olmak) Fiili', description: 'Şahıs zamirleri (ich, du, er/sie/es), Sein formülü ve der/die/das ile ilk temas. Almancanın kurallı yapısı.', unitId: 'de_a1_1_u1' },
      { icon: 'book', title: 'Alfabe ve Telaffuz', description: 'Ä, ö, ü, ß sesleri. Almanca okunuş kuralları.' },
      { icon: 'pen', title: 'Sayılar ve Selamlaşma', description: 'Eins, zwei, drei… Guten Tag, Auf Wiedersehen.' },
      { icon: 'message', title: 'Günlük Kalıplar', description: 'Bitte, Danke, Entschuldigung.' },
    ],
    A2: [{ icon: 'book', title: 'Yakında', description: 'Almanca A2 müfredatı üzerinde çalışıyoruz.' }],
    B1: [{ icon: 'book', title: 'Yakında', description: 'Almanca B1 müfredatı üzerinde çalışıyoruz.' }],
    B2: [{ icon: 'book', title: 'Yakında', description: 'Almanca B2 müfredatı üzerinde çalışıyoruz.' }],
    C1: [{ icon: 'book', title: 'Yakında', description: 'Almanca C1 müfredatı üzerinde çalışıyoruz.' }],
  },
};

function UnitDetailPanel({
  unit,
  onClose,
  onOpenLesson,
}: {
  unit: UnitContent;
  onClose: () => void;
  onOpenLesson: (lessonIndex: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/98 dark:bg-slate-950/98 backdrop-blur-md">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-700/60 bg-slate-900/95 dark:bg-slate-950/95 px-4 py-3">
        <h2 className="text-lg font-bold text-slate-100 truncate">{unit.title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 max-w-3xl mx-auto w-full">
        {unit.lessons.map((lesson, idx) => (
          <LessonBlock
            key={idx}
            lesson={lesson}
            onStartLesson={() => onOpenLesson(idx)}
          />
        ))}
      </div>
    </div>
  );
}

function LessonBlock({ lesson, onStartLesson }: { lesson: LessonItem; onStartLesson: () => void }) {
  return (
    <section className="mb-10">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold text-indigo-400 dark:text-indigo-300">
          {lesson.lessonTitle}
        </h3>
        <button
          type="button"
          onClick={onStartLesson}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
        >
          Dersi aç
        </button>
      </div>
      <div className="rounded-xl bg-slate-800/80 dark:bg-slate-800/80 border border-slate-600/50 p-4 mb-3">
        <p className="text-sm text-slate-300 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
          {lesson.grammarBlock}
        </p>
      </div>
      <p className="text-slate-300 dark:text-slate-300 text-sm leading-relaxed mb-4">
        {lesson.content}
      </p>
      {lesson.conjugation && lesson.conjugation.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Çekim tablosu
          </p>
          <table className="w-full min-w-[280px] border-collapse rounded-lg overflow-hidden border border-slate-600/50">
            <thead>
              <tr className="bg-slate-700/60 text-left">
                <th className="px-3 py-2 text-xs font-semibold text-slate-300">Özne</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-300">Fiil</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-300">Telaffuz</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-300">Anlam</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {lesson.conjugation.map((row, i) => (
                <tr key={i} className="border-t border-slate-600/50 even:bg-slate-800/40">
                  <td className="px-3 py-2 font-medium text-slate-100">{row.subject}</td>
                  <td className="px-3 py-2 text-indigo-300">{row.verb}</td>
                  <td className="px-3 py-2 text-slate-400 italic">{row.phonetic ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-400">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lesson.examples && lesson.examples.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Örnek cümleler
          </p>
          <ul className="space-y-2">
            {lesson.examples.map((ex, i) => (
              <li
                key={i}
                className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 rounded-lg bg-slate-800/60 dark:bg-slate-800/60 border border-slate-600/40 p-3"
              >
                <span className="font-medium text-slate-100">{ex.original}</span>
                {ex.phonetic && (
                  <span className="text-xs italic text-slate-500">{ex.phonetic}</span>
                )}
                <span className="text-slate-400 text-sm sm:ml-auto">→ {ex.turkish}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function LearningPath() {
  const [lang, setLang] = useState<Lang>('fr');
  const [level, setLevel] = useState<Level>('A1');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  /** İnteraktif ders ekranı: ünite + ders indeksi. Açıkken unit panel kapanır. */
  const [selectedLesson, setSelectedLesson] = useState<{ unitId: string; lessonIndex: number } | null>(null);

  const modules = CURRICULUM[lang][level];
  const selectedUnit = selectedUnitId ? getUnitContent(selectedUnitId) : null;
  const lessonViewUnit = selectedLesson ? getUnitContent(selectedLesson.unitId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/20 to-slate-200/80 dark:from-[#0a0f1a] dark:via-[#0f1623] dark:to-[#151d2e] transition-colors duration-500">
      <Helmet>
        <title>Öğrenme Yolu | Diloloji</title>
        <meta name="description" content="Fransızca ve İspanyolca A1–C1 müfredat yol haritası." />
      </Helmet>

      <Navbar />

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
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer flex items-center gap-2 ${
                lang === 'es' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span aria-hidden>🇪🇸</span>
              İspanyolca
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lang === 'en'}
              onClick={() => setLang('en')}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer flex items-center gap-2 ${
                lang === 'en' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span aria-hidden>🇬🇧</span>
              İngilizce
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lang === 'de'}
              onClick={() => setLang('de')}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer flex items-center gap-2 ${
                lang === 'de' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span aria-hidden>🇩🇪</span>
              Almanca
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
                onClick={() => mod.unitId && setSelectedUnitId(mod.unitId)}
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

      {/* Ünite detay paneli (tam ekran) — ders ekranı kapalıyken */}
      {selectedUnit && !selectedLesson && (
        <UnitDetailPanel
          unit={selectedUnit}
          onClose={() => setSelectedUnitId(null)}
          onOpenLesson={(lessonIndex) => {
            setSelectedUnitId(null);
            setSelectedLesson({ unitId: selectedUnit.id, lessonIndex });
          }}
        />
      )}

      {/* İnteraktif ders ekranı (tam ekran, z-50, arka plan #0a0e17) */}
      {lessonViewUnit && selectedLesson && (
        <LessonView
          unit={lessonViewUnit}
          lessonIndex={selectedLesson.lessonIndex}
          lang={lang}
          onClose={() => setSelectedLesson(null)}
          onComplete={() => setSelectedLesson(null)}
        />
      )}
    </div>
  );
}
