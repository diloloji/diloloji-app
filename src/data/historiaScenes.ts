/**
 * Historia Mode — İspanyolca sahneli fiil seçim oyunu.
 *
 * Her sahne: kısa hikaye + boşluklu cümle + doğru zaman/zamir/çekim.
 * Tüm sahneler hardcoded; AI ile yeni sahneler ürettiğinizde SCENES dizisine ekleyin.
 *
 * Zorluk: A2 (temel geçmiş/şimdiki), B1 (karma zamanlar, düzensiz), B2 (subjuntivo, kip/zaman ayrımı).
 * Tema: günlük yaşam (kahvaltı, iş, tatil, arkadaş, alışveriş, aile, doktor, hafta sonu).
 *
 * Yeni sahne eklerken:
 * - `verb` tam infinitivo (querer, tener, ir...).
 * - `correctForm` stringini spanish-verbs kütüphanesinin ürettiği form ile uyumlu yazın.
 * - `whyTense`: yanlış zaman seçiminde gösterilen 1 cümlelik ipucu.
 * - `whyForm` (ops.): düzensiz çekim için ek açıklama (yoksa otomatik kural motoru devreye girer).
 */
import type { PronounEs, TenseIdEs } from './spanish';

export type HistoriaDifficulty = 'A2' | 'B1' | 'B2';

export type HistoriaTheme =
  | 'breakfast'
  | 'work'
  | 'vacation'
  | 'friends'
  | 'shopping'
  | 'family'
  | 'doctor'
  | 'weekend';

export interface HistoriaScene {
  id: string;
  difficulty: HistoriaDifficulty;
  theme: HistoriaTheme;
  /** İspanyolca sahne metni (2-3 cümle). */
  storyEs: string;
  /** Türkçe çeviri (anlamayı hızlandırır). */
  storyTr: string;
  /** Cümle şablonu: boşluk için tam olarak `{blank}` yer tutucusu kullanın. */
  sentenceEs: string;
  /** Cümlenin Türkçe karşılığı (opsiyonel ama faydalı). */
  sentenceTr?: string;
  /** İnfinitif fiil — boşluğun yanında ipucu olarak gösterilir. */
  verb: string;
  correctTense: TenseIdEs;
  correctPronoun: PronounEs;
  /** Doğru çekim — spanish-verbs kütüphanesinin üreteceği string ile aynı olmalı. */
  correctForm: string;
  /** Yanlış zaman seçilirse gösterilen 1 cümlelik ipucu. */
  whyTense: string;
  /** Yanlış çekim için özel ipucu (yoksa otomatik kural motoru kullanılır). */
  whyForm?: string;
}

export const THEME_META: Record<HistoriaTheme, { label: string; emoji: string }> = {
  breakfast: { label: 'Kahvaltı', emoji: '☕' },
  work: { label: 'İş', emoji: '💼' },
  vacation: { label: 'Tatil', emoji: '✈️' },
  friends: { label: 'Arkadaşlar', emoji: '💬' },
  shopping: { label: 'Alışveriş', emoji: '🛍️' },
  family: { label: 'Aile', emoji: '👨‍👩‍👧' },
  doctor: { label: 'Doktor', emoji: '🩺' },
  weekend: { label: 'Hafta Sonu', emoji: '🌤️' },
};

export const DIFFICULTY_META: Record<HistoriaDifficulty, { label: string; color: string }> = {
  A2: { label: 'A2', color: 'emerald' },
  B1: { label: 'B1', color: 'amber' },
  B2: { label: 'B2', color: 'rose' },
};

export const HISTORIA_SCENES: HistoriaScene[] = [
  {
    id: 'breakfast-cafe',
    difficulty: 'A2',
    theme: 'breakfast',
    storyEs: 'Son las 8 de la mañana. María entra a la cocina y ve que no hay café.',
    storyTr: 'Saat sabahın 8\'i. María mutfağa giriyor ve kahve olmadığını görüyor.',
    sentenceEs: 'Ella {blank} hacer el desayuno.',
    sentenceTr: 'Kahvaltı hazırlamak istiyor.',
    verb: 'querer',
    correctTense: 'presente',
    correctPronoun: 'el',
    correctForm: 'quiere',
    whyTense: 'Şu an gerçekleşen bir durum anlatıldığı için Presente kullanılır.',
    whyForm: 'querer fiili yo/tú/él formlarında kökteki e → ie dönüşür: "quiere".',
  },
  {
    id: 'family-mother-profesora',
    difficulty: 'A2',
    theme: 'family',
    storyEs: 'Tengo una familia pequeña: mi hermana, mis padres y yo. Todos trabajamos o estudiamos.',
    storyTr: 'Küçük bir ailem var: kız kardeşim, annem babam ve ben. Hepimiz çalışıyor ya da okuyoruz.',
    sentenceEs: 'Mi hermana {blank} profesora en una escuela.',
    sentenceTr: 'Kız kardeşim bir okulda öğretmendir.',
    verb: 'ser',
    correctTense: 'presente',
    correctPronoun: 'el',
    correctForm: 'es',
    whyTense: 'Kalıcı bir özellik / meslek belirtildiği için Presente (ser) kullanılır.',
    whyForm: 'ser düzensiz bir fiildir: él/ella → "es".',
  },
  {
    id: 'shopping-panaderia',
    difficulty: 'A2',
    theme: 'shopping',
    storyEs: 'Ayer fui al centro con mi amigo. Teníamos hambre y paramos en la panadería.',
    storyTr: 'Dün arkadaşımla merkeze gittim. Aç idik ve fırının önünde durduk.',
    sentenceEs: 'Yo {blank} un pan recién hecho.',
    sentenceTr: 'Taze yapılmış bir ekmek aldım.',
    verb: 'comprar',
    correctTense: 'preterito',
    correctPronoun: 'yo',
    correctForm: 'compré',
    whyTense: 'Dün tamamlanmış tek seferlik bir eylem olduğu için Pretérito Indefinido kullanılır.',
  },
  {
    id: 'family-childhood-futbol',
    difficulty: 'B1',
    theme: 'family',
    storyEs: 'Recuerdo mi infancia con mucho cariño. Vivíamos en un pueblo pequeño y todo era tranquilo.',
    storyTr: 'Çocukluğumu büyük bir sevgiyle hatırlıyorum. Küçük bir köyde yaşardık ve her şey sakindi.',
    sentenceEs: 'Cuando era niño, yo {blank} al fútbol cada tarde.',
    sentenceTr: 'Çocukken her öğleden sonra futbol oynardım.',
    verb: 'jugar',
    correctTense: 'imperfecto',
    correctPronoun: 'yo',
    correctForm: 'jugaba',
    whyTense: 'Geçmişte tekrarlanan / alışkanlık haline gelmiş bir eylem olduğu için Imperfecto kullanılır.',
  },
  {
    id: 'vacation-barcelona',
    difficulty: 'B1',
    theme: 'vacation',
    storyEs: 'El verano pasado tuvimos vacaciones muy largas. Queríamos conocer un lugar nuevo en España.',
    storyTr: 'Geçen yaz çok uzun bir tatilimiz oldu. İspanya\'da yeni bir yer tanımak istedik.',
    sentenceEs: 'Mi familia {blank} a Barcelona.',
    sentenceTr: 'Ailem Barselona\'ya gitti.',
    verb: 'ir',
    correctTense: 'preterito',
    correctPronoun: 'el',
    correctForm: 'fue',
    whyTense: 'Belirli bir zamanda (geçen yaz) tamamlanmış bir yolculuk olduğu için Pretérito Indefinido.',
    whyForm: 'ir fiili Pretérito Indefinido\'da tamamen düzensiz: él → "fue" (ser ile aynıdır).',
  },
  {
    id: 'work-meeting-morning',
    difficulty: 'B1',
    theme: 'work',
    storyEs: 'Hoy ha sido un día intenso en la oficina. La reunión con el director terminó hace diez minutos.',
    storyTr: 'Bugün ofiste yoğun bir gündü. Müdürle toplantı on dakika önce bitti.',
    sentenceEs: 'Esta mañana yo {blank} con mi jefe sobre el proyecto.',
    sentenceTr: 'Bu sabah proje hakkında patronumla konuştum.',
    verb: 'hablar',
    correctTense: 'preterito-perfecto',
    correctPronoun: 'yo',
    correctForm: 'he hablado',
    whyTense: '"Esta mañana" hâlâ bitmemiş bir zaman dilimi belirttiği için Pretérito Perfecto kullanılır.',
    whyForm: 'Pretérito Perfecto = haber (presente) + participio. hablar → hablado, yo haber → "he".',
  },
  {
    id: 'doctor-headache',
    difficulty: 'B1',
    theme: 'doctor',
    storyEs: 'Estoy en la sala de espera del médico. Desde esta mañana no me encuentro bien.',
    storyTr: 'Doktorun bekleme odasındayım. Bu sabahtan beri iyi hissetmiyorum.',
    sentenceEs: 'Hoy no {blank} bien, me duele la cabeza.',
    sentenceTr: 'Bugün iyi hissetmiyorum, başım ağrıyor.',
    verb: 'sentir',
    correctTense: 'presente',
    correctPronoun: 'yo',
    correctForm: 'siento',
    whyTense: 'Şu anki durumu anlatan anlık his olduğu için Presente kullanılır.',
    whyForm: 'sentir kökü yo/tú/él formlarında e → ie olarak değişir: "siento".',
  },
  {
    id: 'friends-weekend-movie',
    difficulty: 'A2',
    theme: 'friends',
    storyEs: 'El sábado por la noche llamo a Pablo. Queremos salir a ver una película nueva.',
    storyTr: 'Cumartesi akşamı Pablo\'yu arıyorum. Yeni bir film izlemeye çıkmak istiyoruz.',
    sentenceEs: 'Nosotros {blank} entradas para el cine.',
    sentenceTr: 'Sinema için bilet alıyoruz.',
    verb: 'comprar',
    correctTense: 'presente',
    correctPronoun: 'nosotros',
    correctForm: 'compramos',
    whyTense: 'Şu anda gerçekleşen rutin bir eylem olduğu için Presente kullanılır.',
  },
  {
    id: 'work-pluscuamperfecto',
    difficulty: 'B2',
    theme: 'work',
    storyEs: 'Llegué tarde al trabajo porque el metro se averió. Cuando por fin entré a la oficina, todo estaba listo.',
    storyTr: 'İşe geç kaldım çünkü metro arızalandı. Ofise nihayet girdiğimde her şey hazırdı.',
    sentenceEs: 'Mi colega ya {blank} el informe cuando llegué.',
    sentenceTr: 'Ben geldiğimde meslektaşım raporu çoktan bitirmişti.',
    verb: 'terminar',
    correctTense: 'pluscuamperfecto',
    correctPronoun: 'el',
    correctForm: 'había terminado',
    whyTense: 'Geçmişteki başka bir eylemden (llegué) önce biten eylem için Pluscuamperfecto kullanılır.',
    whyForm: 'Pluscuamperfecto = haber (imperfecto) + participio. él → "había", terminar → "terminado".',
  },
  {
    id: 'friends-subjuntivo-fiesta',
    difficulty: 'B2',
    theme: 'friends',
    storyEs: 'Mañana es mi cumpleaños y organizo una fiesta en casa. Mis amigos viven lejos, pero quiero verlos a todos.',
    storyTr: 'Yarın doğum günüm ve evde bir parti düzenliyorum. Arkadaşlarım uzakta yaşıyor ama hepsini görmek istiyorum.',
    sentenceEs: 'Espero que tú {blank} a la fiesta mañana.',
    sentenceTr: 'Yarın partiye gelmeni umuyorum.',
    verb: 'venir',
    correctTense: 'subjuntivo-presente',
    correctPronoun: 'tu',
    correctForm: 'vengas',
    whyTense: '"Espero que" + dilek/arzu ifadesi Subjuntivo Presente\'yi tetikler.',
    whyForm: 'venir yo formu "vengo" → subjuntivo kökü veng-: tú → "vengas".',
  },
  {
    id: 'vacation-condicional',
    difficulty: 'B2',
    theme: 'vacation',
    storyEs: 'Mi sueño siempre ha sido recorrer el mundo. Pero mi trabajo y mi presupuesto no me lo permiten ahora.',
    storyTr: 'Hayalim hep dünyayı gezmekti. Ama işim ve bütçem şu an buna izin vermiyor.',
    sentenceEs: 'Si tuviera más dinero, yo {blank} por todo el mundo.',
    sentenceTr: 'Daha fazla param olsaydı, dünyayı gezerdim.',
    verb: 'viajar',
    correctTense: 'condicional',
    correctPronoun: 'yo',
    correctForm: 'viajaría',
    whyTense: 'Gerçek olmayan bir koşulun sonucu anlatıldığı için Condicional kullanılır.',
  },
  {
    id: 'shopping-jacket-preterito',
    difficulty: 'B1',
    theme: 'shopping',
    storyEs: 'La semana pasada fui a las rebajas de invierno. Encontré una chaqueta preciosa en mi talla.',
    storyTr: 'Geçen hafta kış indirimlerine gittim. Kendi bedenimde çok güzel bir ceket buldum.',
    sentenceEs: 'La chaqueta me {blank} 50 euros.',
    sentenceTr: 'Ceket bana 50 avroya mal oldu.',
    verb: 'costar',
    correctTense: 'preterito',
    correctPronoun: 'el',
    correctForm: 'costó',
    whyTense: 'Geçmişte tek bir olayda tamamlanmış fiyat bilgisi için Pretérito Indefinido.',
    whyForm: 'costar Pretérito Indefinido\'da düzenlidir (kök değişmez): él → "costó".',
  },
  {
    id: 'weekend-futuro',
    difficulty: 'B1',
    theme: 'weekend',
    storyEs: 'Este fin de semana tengo planes con unos amigos. Hace tiempo que no nos vemos.',
    storyTr: 'Bu hafta sonu birkaç arkadaşımla planlarım var. Uzun zamandır görüşmedik.',
    sentenceEs: 'El sábado nosotros {blank} a la montaña.',
    sentenceTr: 'Cumartesi dağa gideceğiz.',
    verb: 'ir',
    correctTense: 'futuro',
    correctPronoun: 'nosotros',
    correctForm: 'iremos',
    whyTense: 'Gelecek bir plan anlatıldığı için Futuro Simple kullanılır.',
  },
];

/** Sahneleri zorluk + temaya göre filtreleyen yardımcı. */
export function filterScenes(
  difficulties: HistoriaDifficulty[] | 'all' = 'all',
  themes: HistoriaTheme[] | 'all' = 'all'
): HistoriaScene[] {
  return HISTORIA_SCENES.filter((s) => {
    const d = difficulties === 'all' || difficulties.includes(s.difficulty);
    const t = themes === 'all' || themes.includes(s.theme);
    return d && t;
  });
}

/** Fisher-Yates ile sahneleri karıştırır (seans başlangıcında kullanılır). */
export function shuffleScenes(scenes: HistoriaScene[]): HistoriaScene[] {
  const arr = [...scenes];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Boşluklu cümleyi parçalara ayırır: [önce, sonra]. */
export function splitSentence(template: string): { before: string; after: string } {
  const idx = template.indexOf('{blank}');
  if (idx === -1) return { before: template, after: '' };
  return { before: template.slice(0, idx), after: template.slice(idx + '{blank}'.length) };
}
