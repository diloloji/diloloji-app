/**
 * Düzensiz (irregular) fiiller: çekim tablosu üstünde uyarı banner'ı göstermek için kullanılır.
 * Mastar hali normalize edilerek (küçük harf, aksansız) eşleştirilir.
 */
import type { AppLanguage } from './verbs';

function normalizeForIrregular(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Fransızca düzensiz fiiller (mastar, normalize edilmeden önce) */
const IRREGULAR_FR_RAW = [
  'être', 'avoir', 'aller', 'faire', 'dire', 'pouvoir', 'vouloir', 'voir', 'savoir',
  'venir', 'tenir', 'prendre', 'mettre', 'connaître', 'croire', 'boire', 'écrire', 'lire',
  'vivre', 'suivre', 'conduire', 'construire', 'produire', 'réduire', 'cuire', 'détruire',
  'paraître', 'disparaître', 'naître', 'plaire', 'décrire', 'sourire', 'suffire',
  'recevoir', 'apercevoir', 'devoir', 'valoir', 'concevoir', 'décevoir', 'prévoir', 'revoir',
  'courir', 'secourir', 'accourir', 'concourir', 'offrir', 'souffrir', 'couvrir', 'découvrir',
  'ouvrir', 'cueillir', 'accueillir', 'assaillir', 'tressaillir', 'faillir', 'saillir',
  'partir', 'sortir', 'dormir', 'mentir', 'servir', 'sentir', 'courir', 'mourir',
  'vêtir', 'répartir', 'ressortir', 'endormir', 'repentir', 'resservir', 'consentir',
  'bouillir', 'gésir', 'ouïr', 'quérir', 'braire', 'frire', 'clore', 'absoudre', 'résoudre', 'moudre',
  'etre', 'connaitre', 'ecrire', 'paraitre', 'disparaitre', 'naitre', 'decrire', 'recevoir',
  'decevoir', 'prevoir', 'decouvrir', 'couvrir', 'ouvrir', 'accueillir', 'cueillir',
];

/** İspanyolca düzensiz fiiller */
const IRREGULAR_ES_RAW = [
  'ser', 'estar', 'ir', 'haber', 'tener', 'hacer', 'decir', 'poder', 'poner', 'venir',
  'salir', 'saber', 'querer', 'ver', 'dar', 'caber', 'traer', 'oir', 'andar', 'asir',
  'conducir', 'traducir', 'producir', 'reducir', 'lucir', 'concluir', 'construir', 'destruir',
  'satisfacer', 'placer', 'yacer', 'erguir', 'cocer', 'mover', 'resolver', 'absolver', 'disolver',
  'volver', 'devolver', 'revolver', 'morder', 'soler', 'llover', 'nevar', 'doler', 'dormir',
  'morir', 'podrir', 'preferir', 'sentir', 'mentir', 'advertir', 'convertir', 'referir',
  'pedir', 'repetir', 'servir', 'vestir', 'seguir', 'conseguir', 'elegir', 'corregir',
  'medir', 'reir', 'sonreir', 'freir', 'despedir', 'impedir', 'competir', 'rendir',
  'bullir', 'engullir', 'zambullir', 'teñir', 'ceñir', 'reñir', 'gruñir', 'mullir',
];

const IRREGULAR_FR = new Set(IRREGULAR_FR_RAW.map(normalizeForIrregular));
const IRREGULAR_ES = new Set(IRREGULAR_ES_RAW.map(normalizeForIrregular));

/**
 * Verilen mastar fiilin o dilde düzensiz (irregular) kabul edilip edilmeyeceğini döner.
 * Arama/çekim mantığında verbKey ile kullanılır.
 */
export function isIrregularVerb(verbKey: string, lang: AppLanguage): boolean {
  const normalized = normalizeForIrregular(verbKey);
  return lang === 'es' ? IRREGULAR_ES.has(normalized) : IRREGULAR_FR.has(normalized);
}
