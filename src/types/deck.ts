// Aralıklı Tekrar Sistemi (SRS) — Veri Modelleri

export type SRSGrade = 0 | 1 | 2 | 3; // Again | Hard | Good | Easy

export interface SRSData {
  /** Bir sonraki tekrara kadar bekleme süresi (gün) */
  interval: number;
  /** SM-2 kolaylık faktörü — varsayılan 2.5 */
  easeFactor: number;
  /** Başarılı tekrar sayısı */
  repetitions: number;
  /** ISO tarih (YYYY-MM-DD) — bir sonraki tekrar tarihi */
  nextReviewDate: string;
}

export interface Card {
  id: string;
  front: string;
  back: string;
  hint?: string;
  audioUrl?: string;
  srs: SRSData;
}

export interface Deck {
  id: string;
  title: string;
  language: string;
  icon?: string;
  description?: string;
  author?: string;
  isPublic: boolean;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
  cards: Card[];
}

// ─── SM-2 Algoritması ─────────────────────────────────────────────────────

export function defaultSRS(): SRSData {
  return {
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewDate: todayStr(),
  };
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * SM-2 tabanlı SRS hesaplama.
 * grade 0=Again, 1=Hard, 2=Good, 3=Easy
 */
export function applyGrade(card: Card, grade: SRSGrade): Card {
  let { interval, easeFactor, repetitions } = card.srs;

  if (grade === 0) {
    // Again: sıfırla, 1 gün sonra tekrar
    interval = 1;
    repetitions = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (grade === 1) {
    // Hard: küçük artış
    interval = Math.max(1, Math.round(interval * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    repetitions = Math.max(1, repetitions);
  } else if (grade === 2) {
    // Good: standart SM-2
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions++;
  } else {
    // Easy: hızlandırılmış
    if (repetitions === 0) interval = 4;
    else if (repetitions === 1) interval = 10;
    else interval = Math.round(interval * easeFactor * 1.3);
    easeFactor = Math.min(3.0, easeFactor + 0.1);
    repetitions++;
  }

  return {
    ...card,
    srs: { interval, easeFactor, repetitions, nextReviewDate: addDays(interval) },
  };
}

/** Bugün (veya geçmişte) tekrarı gelen kartları filtrele */
export function getDueCards(deck: Deck): Card[] {
  const today = todayStr();
  return deck.cards.filter((c) => c.srs.nextReviewDate <= today);
}

/** Karta memnuniyet etiketi (rozet rengi için) */
export function gradeLabel(grade: SRSGrade): string {
  return ['Yeniden', 'Zor', 'İyi', 'Kolay'][grade];
}

export function gradeColor(grade: SRSGrade): string {
  return [
    'bg-red-500/20 border-red-500/50 text-red-300',
    'bg-orange-500/20 border-orange-500/50 text-orange-300',
    'bg-blue-500/20 border-blue-500/50 text-blue-300',
    'bg-green-500/20 border-green-500/50 text-green-300',
  ][grade];
}

// ─── Topluluk Destelemesi (Built-in) ──────────────────────────────────────

function makeCard(front: string, back: string, hint?: string): Card {
  return {
    id: `${front.replace(/\s/g, '-')}-${Math.random().toString(36).slice(2, 6)}`,
    front,
    back,
    hint,
    srs: defaultSRS(),
  };
}

function makeDeck(
  id: string,
  title: string,
  language: string,
  icon: string,
  description: string,
  pairs: [string, string, string?][]
): Deck {
  return {
    id,
    title,
    language,
    icon,
    description,
    author: 'Diloloji',
    isPublic: true,
    isBuiltIn: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    cards: pairs.map(([f, b, h]) => makeCard(f, b, h)),
  };
}

export const COMMUNITY_DECKS: Deck[] = [
  makeDeck('es-50-fiil', 'En Sık 50 İspanyolca Fiil', 'İspanyolca', '🇪🇸',
    'Günlük konuşmada en çok karşılaşılan 50 temel fiil', [
      ['ser', 'olmak (kalıcı)', 'Identidad, características permanentes'],
      ['estar', 'olmak (geçici)', 'Estado, ubicación, emociones'],
      ['tener', 'sahip olmak / var olmak'],
      ['hacer', 'yapmak'],
      ['ir', 'gitmek'],
      ['venir', 'gelmek'],
      ['poder', 'yapabilmek / mümkün olmak'],
      ['querer', 'istemek / sevmek'],
      ['saber', 'bilmek (bilgi)'],
      ['conocer', 'tanımak / bilmek (kişi/yer)'],
      ['decir', 'söylemek'],
      ['ver', 'görmek'],
      ['dar', 'vermek'],
      ['hablar', 'konuşmak'],
      ['comer', 'yemek'],
      ['vivir', 'yaşamak'],
      ['trabajar', 'çalışmak'],
      ['estudiar', 'çalışmak / okumak (ders)'],
      ['llegar', 'varmak / ulaşmak'],
      ['salir', 'çıkmak'],
      ['poner', 'koymak'],
      ['traer', 'getirmek'],
      ['llevar', 'taşımak / götürmek'],
      ['pensar', 'düşünmek'],
      ['creer', 'inanmak / sanmak'],
      ['abrir', 'açmak'],
      ['cerrar', 'kapatmak'],
      ['escribir', 'yazmak'],
      ['leer', 'okumak'],
      ['escuchar', 'dinlemek'],
      ['mirar', 'bakmak'],
      ['sentir', 'hissetmek'],
      ['pedir', 'istemek (bir şey)'],
      ['seguir', 'takip etmek / devam etmek'],
      ['encontrar', 'bulmak'],
      ['buscar', 'aramak'],
      ['comprar', 'satın almak'],
      ['vender', 'satmak'],
      ['pagar', 'ödemek'],
      ['ganar', 'kazanmak'],
      ['perder', 'kaybetmek'],
      ['jugar', 'oynamak'],
      ['dormir', 'uyumak'],
      ['descansar', 'dinlenmek'],
      ['necesitar', 'ihtiyaç duymak'],
      ['gustar', 'hoşa gitmek / beğenmek'],
      ['amar', 'sevmek (derin)'],
      ['ayudar', 'yardım etmek'],
      ['esperar', 'beklemek / ummak'],
      ['empezar', 'başlamak'],
    ]),
  makeDeck('fr-a1-temel', 'Fransızca A1 Temel Kelimeler', 'Fransızca', '🇫🇷',
    'A1 seviyesi için mutlaka bilmen gereken 40 kelime', [
      ['bonjour', 'merhaba / günaydın'],
      ['bonsoir', 'iyi akşamlar'],
      ['merci', 'teşekkür ederim'],
      ["s'il vous plaît", 'lütfen (resmi)'],
      ["s'il te plaît", 'lütfen (samimi)'],
      ['oui', 'evet'],
      ['non', 'hayır'],
      ["je m'appelle", 'benim adım...'],
      ['comment vous appelez-vous?', 'Adınız ne? (resmi)'],
      ['ça va?', 'nasılsın?'],
      ['ça va bien', 'iyiyim'],
      ['au revoir', 'hoşça kal'],
      ['à bientôt', 'yakında görüşürüz'],
      ['excusez-moi', 'affedersiniz'],
      ['pardon', 'özür dilerim'],
      ['je ne comprends pas', 'anlamıyorum'],
      ['je ne sais pas', 'bilmiyorum'],
      ['répétez, s\'il vous plaît', 'lütfen tekrar edin'],
      ['où est...?', '...nerede?'],
      ['combien ça coûte?', 'ne kadar tutar?'],
      ['la maison', 'ev'],
      ['le travail', 'iş'],
      ['la famille', 'aile'],
      ['le père', 'baba'],
      ['la mère', 'anne'],
      ['le frère', 'erkek kardeş'],
      ['la sœur', 'kız kardeş'],
      ['l\'ami / l\'amie', 'arkadaş'],
      ['le livre', 'kitap'],
      ['la table', 'masa'],
      ['la chaise', 'sandalye'],
      ['la fenêtre', 'pencere'],
      ['la porte', 'kapı'],
      ['l\'eau', 'su'],
      ['le café', 'kahve'],
      ['le pain', 'ekmek'],
      ['le restaurant', 'restoran'],
      ['l\'hôtel', 'otel'],
      ['la gare', 'tren istasyonu'],
      ['l\'aéroport', 'havalimanı'],
    ]),
  makeDeck('en-phrasal-verbs', 'İngilizce Phrasal Verbs B1', 'İngilizce', '🇬🇧',
    'B1 seviyesinde gerekli 30 temel phrasal verb', [
      ['look up', 'araştırmak / sözlüğe bakmak', 'Look it up in the dictionary.'],
      ['give up', 'vazgeçmek', "Don't give up!"],
      ['take off', 'havalanmak / çıkarmak (kıyafet)', 'The plane takes off at 9.'],
      ['put off', 'ertelemek', "Don't put it off until tomorrow."],
      ['come up with', 'bulmak (fikir)', 'She came up with a great idea.'],
      ['find out', 'öğrenmek / keşfetmek', 'I found out the truth.'],
      ['carry on', 'devam etmek', 'Carry on with your work.'],
      ['set up', 'kurmak / oluşturmak', 'He set up a new company.'],
      ['break down', 'çökmek / arıza yapmak', 'The car broke down.'],
      ['run out of', 'tükenmek', "We've run out of time."],
      ['turn down', 'reddetmek / sesi kısmak', 'He turned down the offer.'],
      ['bring up', 'yetiştirmek / gündeme getirmek', 'She brought up three children.'],
      ['pick up', 'almak / toplamak / iyileşmek', 'Can you pick me up?'],
      ['sort out', 'çözmek / düzenlemek', "Let's sort out this problem."],
      ['fill in', 'doldurmak (form)', 'Fill in the form please.'],
      ['go through', 'geçirmek / incelemek', "Let's go through the plan."],
      ['point out', 'belirtmek / dikkat çekmek', 'She pointed out the mistake.'],
      ['keep up with', 'ayak uydurmak', 'I can\'t keep up with him.'],
      ['look forward to', 'dört gözle beklemek', 'I\'m looking forward to the trip.'],
      ['end up', 'sonunda olmak / kalmak', 'We ended up at a café.'],
      ['show off', 'gösteriş yapmak', 'Stop showing off!'],
      ['hang out', 'takılmak / vakit geçirmek', 'Let\'s hang out tonight.'],
      ['fall apart', 'dağılmak / çökmek', 'My plans fell apart.'],
      ['calm down', 'sakinleşmek', 'Calm down, it\'s okay.'],
      ['figure out', 'anlamak / çözmek', 'I can\'t figure it out.'],
      ['get along', 'geçinmek / anlaşmak', 'They get along well.'],
      ['get over', 'atlatmak / üstesinden gelmek', 'She got over her cold.'],
      ['look after', 'bakmak / ilgilenmek', 'Can you look after my dog?'],
      ['make up', 'uydurmak / barışmak / makyaj yapmak', "Don't make up excuses."],
      ['think over', 'iyice düşünmek', "Think it over before deciding."],
    ]),
  makeDeck('es-a1-sayilar-renkler', 'İspanyolca: Sayılar & Renkler', 'İspanyolca', '🇪🇸',
    'Temel sayılar ve renkler', [
      ['uno', 'bir'],
      ['dos', 'iki'],
      ['tres', 'üç'],
      ['cuatro', 'dört'],
      ['cinco', 'beş'],
      ['seis', 'altı'],
      ['siete', 'yedi'],
      ['ocho', 'sekiz'],
      ['nueve', 'dokuz'],
      ['diez', 'on'],
      ['veinte', 'yirmi'],
      ['cien', 'yüz'],
      ['rojo', 'kırmızı'],
      ['azul', 'mavi'],
      ['verde', 'yeşil'],
      ['amarillo', 'sarı'],
      ['blanco', 'beyaz'],
      ['negro', 'siyah'],
      ['gris', 'gri'],
      ['naranja', 'turuncu'],
      ['morado', 'mor'],
      ['rosa', 'pembe'],
      ['marrón', 'kahverengi'],
    ]),
];
