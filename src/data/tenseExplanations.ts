/**
 * Fiil Laboratuvarı — seçili zamanın (tense) mantığını anlatan kısa ve detaylı açıklamalar.
 * shortDesc: bilgi kutusunda gösterilen kısa metin.
 * longDesc, formation, examples: detay modalında kullanılır.
 */

import type { AppLanguage } from './verbs';
import type { TenseId } from './types';
import type { TenseIdEs } from './spanish';

type TenseIdFr = TenseId;

export interface TenseExplanationDetail {
  shortDesc: string;
  longDesc: string;
  formation: string;
  examples: string[];
}

const PLACEHOLDER: TenseExplanationDetail = {
  shortDesc: 'Detaylı açıklama yakında eklenecek.',
  longDesc: 'Bu zaman için detaylı açıklama henüz eklenmedi.',
  formation: '—',
  examples: [],
};

const FR: Record<TenseIdFr, TenseExplanationDetail> = {
  present: {
    shortDesc:
      'Şu an gerçekleşen eylemleri veya genel geçer durumları ifade eder (Şimdiki/Geniş Zaman).',
    longDesc:
      'Le Présent (şimdiki/geniş zaman), Fransızcada hem şu anda gerçekleşen eylemleri hem de genel geçer doğruları, alışkanlıkları ve süregelen durumları ifade etmek için kullanılır. Haber kiplerinin en temel zamanıdır ve günlük konuşmada en sık karşınıza çıkar.',
    formation:
      'Düzenli -er fiillerde: fiil köküne -e, -es, -e, -ons, -ez, -ent eklenir (je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent). -ir ve -re fiillerde farklı ekler kullanılır; düzensiz fiillerde kök değişir.',
    examples: [
      'Je mange une pomme.',
      'Nous parlons français.',
      'Il fait beau aujourd\'hui.',
    ],
  },
  imparfait: {
    ...PLACEHOLDER,
    shortDesc:
      'Geçmişte süren, alışkanlık veya tasvir ifade eden eylemler için kullanılır; genelde "iyidi, ederdi" anlamı verir.',
  },
  'passe-simple': {
    ...PLACEHOLDER,
    shortDesc:
      'Yazı dilinde geçmişte tamamlanmış, kesin eylemler için kullanılır; konuşmada yerini Passé Composé alır.',
  },
  'passe-compose': {
    ...PLACEHOLDER,
    shortDesc:
      'Konuşma dilinde geçmişte tamamlanmış eylemleri anlatır; yardımcı fiil (avoir/être) + participe passé ile kurulur.',
  },
  'futur-simple': {
    ...PLACEHOLDER,
    shortDesc:
      'Gelecekte gerçekleşecek eylemleri veya tahmin/niyet ifade eder.',
  },
  'subjonctif-present': {
    ...PLACEHOLDER,
    shortDesc:
      'Dilek, olasılık, zorunluluk veya duygu gerektiren cümlelerde kullanılan dilek kipi.',
  },
};

const ES: Record<TenseIdEs, TenseExplanationDetail> = {
  presente: {
    shortDesc:
      'Şu an gerçekleşen eylemleri veya genel geçer durumları ifade eder (Şimdiki/Geniş Zaman).',
    longDesc:
      'El Presente (şimdiki/geniş zaman), İspanyolcada hem şu anki eylemleri hem de genel doğruları, alışkanlıkları ve kalıcı durumları anlatmak için kullanılır. Indicativo (haber kipi) içinde en temel zamanlardan biridir.',
    formation:
      'Düzenli -ar fiillerde: kök + -o, -as, -a, -amos, -áis, -an (yo hablo, tú hablas, él habla…). -er ve -ir fiillerde farklı son ekler; düzensiz fiillerde (ser, estar, ir, tener, hacer) kök değişir.',
    examples: [
      'Yo como una manzana.',
      'Nosotros hablamos español.',
      'Hoy hace buen tiempo.',
    ],
  },
  imperfecto: {
    ...PLACEHOLDER,
    shortDesc:
      'Geçmişte süren, alışkanlık veya tasvir ifade eden eylemler için kullanılır; "iyidi, ederdi" anlamına gelir.',
  },
  preterito: {
    ...PLACEHOLDER,
    shortDesc:
      'Geçmişte belirli bir anda tamamlanmış eylemler için kullanılır (Pretérito Indefinido).',
  },
  'preterito-perfecto': {
    ...PLACEHOLDER,
    shortDesc:
      'Konuşma dilinde geçmişte tamamlanan eylemler için; haber (şimdiki) + participio ile kurulur.',
  },
  pluscuamperfecto: {
    ...PLACEHOLDER,
    shortDesc:
      'Geçmişte başka bir eylemden önce tamamlanmış eylemler için; había + participio ile kurulur.',
  },
  futuro: {
    ...PLACEHOLDER,
    shortDesc:
      'Gelecekte gerçekleşecek eylemleri veya tahmin ifade eder.',
  },
  'futuro-compuesto': {
    ...PLACEHOLDER,
    shortDesc:
      'Gelecekte bir zamana kadar tamamlanmış olacak eylemler için; habré + participio ile kurulur.',
  },
  condicional: {
    ...PLACEHOLDER,
    shortDesc:
      'Koşula bağlı olasılık, nazik istek veya geçmişte geleceğe dönük eylemleri anlatır.',
  },
  'subjuntivo-presente': {
    ...PLACEHOLDER,
    shortDesc:
      'Dilek, olasılık, duygu veya zorunluluk ifade eden cümlelerde kullanılan dilek kipi.',
  },
};

const BY_LANG: Record<AppLanguage, Record<string, TenseExplanationDetail>> = {
  fr: FR,
  es: ES,
};

/**
 * Seçilen dil ve zaman id'sine göre detaylı açıklama objesi döner; yoksa null.
 */
export function getTenseExplanation(
  lang: AppLanguage,
  tenseId: string
): TenseExplanationDetail | null {
  const byLang = BY_LANG[lang];
  if (!byLang || !tenseId) return null;
  return byLang[tenseId] ?? null;
}
