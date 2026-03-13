/**
 * Fiil Laboratuvarı — seçili zamanın (tense) mantığını anlatan kısa Türkçe açıklamalar.
 * tense id → açıklama metni.
 */

import type { AppLanguage } from './verbs';
import type { TenseId } from './types';
import type { TenseIdEs } from './spanish';

type TenseIdFr = TenseId;
type TenseIdAny = TenseIdFr | TenseIdEs;

const FR: Record<TenseIdFr, string> = {
  present:
    'Şu an gerçekleşen eylemleri veya genel geçer durumları ifade eder (Şimdiki/Geniş Zaman).',
  imparfait:
    'Geçmişte süren, alışkanlık veya tasvir ifade eden eylemler için kullanılır; genelde "iyidi, ederdi" anlamı verir.',
  'passe-simple':
    'Yazı dilinde geçmişte tamamlanmış, kesin eylemler için kullanılır; konuşmada yerini Passé Composé alır.',
  'passe-compose':
    'Konuşma dilinde geçmişte tamamlanmış eylemleri anlatır; yardımcı fiil (avoir/être) + participe passé ile kurulur.',
  'futur-simple':
    'Gelecekte gerçekleşecek eylemleri veya tahmin/niyet ifade eder.',
  'subjonctif-present':
    'Dilek, olasılık, zorunluluk veya duygu gerektiren cümlelerde kullanılan dilek kipi.',
};

const ES: Record<TenseIdEs, string> = {
  presente:
    'Şu an gerçekleşen eylemleri veya genel geçer durumları ifade eder (Şimdiki/Geniş Zaman).',
  imperfecto:
    'Geçmişte süren, alışkanlık veya tasvir ifade eden eylemler için kullanılır; "iyidi, ederdi" anlamına gelir.',
  preterito:
    'Geçmişte belirli bir anda tamamlanmış eylemler için kullanılır (Pretérito Indefinido).',
  futuro:
    'Gelecekte gerçekleşecek eylemleri veya tahmin ifade eder.',
  condicional:
    'Koşula bağlı olasılık, nazik istek veya geçmişte geleceğe dönük eylemleri anlatır.',
  'subjuntivo-presente':
    'Dilek, olasılık, duygu veya zorunluluk ifade eden cümlelerde kullanılan dilek kipi.',
};

const BY_LANG: Record<AppLanguage, Record<string, string>> = {
  fr: FR,
  es: ES,
};

/**
 * Seçilen dil ve zaman id'sine göre Türkçe açıklama döner; yoksa null.
 */
export function getTenseExplanation(
  lang: AppLanguage,
  tenseId: string
): string | null {
  const byLang = BY_LANG[lang];
  if (!byLang || !tenseId) return null;
  return byLang[tenseId] ?? null;
}
