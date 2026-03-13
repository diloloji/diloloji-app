/**
 * Fiil Laboratuvarı — fiil temel formları ve yardımcı fiil (mock/statik).
 * API bağlanana kadar yer tutucu; bazı yaygın fiiller için gerçekçi değerler.
 */

import type { AppLanguage } from './verbs';

export type VerbMetadata = {
  infinitive: string;
  gerund: string;
  pastParticiple: string;
  isRegular: boolean;
  auxiliary: string;
};

/** Fransızca être ile çekilen fiiller (Passé Composé). */
const FR_ETRE_VERBS = new Set([
  'aller', 'venir', 'partir', 'sortir', 'entrer', 'retourner', 'arriver', 'mourir',
  'naître', 'descendre', 'monter', 'rester', 'tomber', 'passer',
]);

/** Yaygın fiiller için mock gerund ve past participle (FR). */
const FR_FORMS: Record<string, { gerund: string; pastParticiple: string }> = {
  avoir: { gerund: 'ayant', pastParticiple: 'eu' },
  être: { gerund: 'étant', pastParticiple: 'été' },
  faire: { gerund: 'faisant', pastParticiple: 'fait' },
  aller: { gerund: 'allant', pastParticiple: 'allé' },
  venir: { gerund: 'venant', pastParticiple: 'venu' },
  parler: { gerund: 'parlant', pastParticiple: 'parlé' },
  finir: { gerund: 'finissant', pastParticiple: 'fini' },
  prendre: { gerund: 'prenant', pastParticiple: 'pris' },
  dire: { gerund: 'disant', pastParticiple: 'dit' },
  voir: { gerund: 'voyant', pastParticiple: 'vu' },
  pouvoir: { gerund: 'pouvant', pastParticiple: 'pu' },
  vouloir: { gerund: 'voulant', pastParticiple: 'voulu' },
  savoir: { gerund: 'sachant', pastParticiple: 'su' },
  devoir: { gerund: 'devant', pastParticiple: 'dû' },
};

/** İspanyolca: yardımcı haber (genelde), ser (pasiva). */
const ES_FORMS: Record<string, { gerund: string; pastParticiple: string }> = {
  ser: { gerund: 'siendo', pastParticiple: 'sido' },
  estar: { gerund: 'estando', pastParticiple: 'estado' },
  tener: { gerund: 'teniendo', pastParticiple: 'tenido' },
  hacer: { gerund: 'haciendo', pastParticiple: 'hecho' },
  ir: { gerund: 'yendo', pastParticiple: 'ido' },
  hablar: { gerund: 'hablando', pastParticiple: 'hablado' },
  comer: { gerund: 'comiendo', pastParticiple: 'comido' },
  vivir: { gerund: 'viviendo', pastParticiple: 'vivido' },
  poder: { gerund: 'pudiendo', pastParticiple: 'podido' },
  querer: { gerund: 'queriendo', pastParticiple: 'querido' },
  decir: { gerund: 'diciendo', pastParticiple: 'dicho' },
  ver: { gerund: 'viendo', pastParticiple: 'visto' },
};

function getFrenchAuxiliary(verbKey: string): string {
  return FR_ETRE_VERBS.has(verbKey.toLowerCase()) ? 'être' : 'avoir';
}

function getSpanishAuxiliary(_verbKey: string): string {
  return 'haber';
}

/** Yer tutucu form üret (bilinmeyen fiil). */
function placeholderForms(verbKey: string, lang: AppLanguage): { gerund: string; pastParticiple: string } {
  const key = verbKey.toLowerCase();
  if (lang === 'fr') {
    if (key.endsWith('er')) return { gerund: key.slice(0, -2) + 'ant', pastParticiple: key.slice(0, -2) + 'é' };
    if (key.endsWith('ir')) return { gerund: key.slice(0, -2) + 'issant', pastParticiple: key.slice(0, -2) + 'i' };
    return { gerund: key + 'ant', pastParticiple: key + 'u' };
  }
  if (key.endsWith('ar')) return { gerund: key.slice(0, -2) + 'ando', pastParticiple: key.slice(0, -2) + 'ado' };
  if (key.endsWith('er') || key.endsWith('ir')) return { gerund: key.slice(0, -2) + 'iendo', pastParticiple: key.slice(0, -2) + 'ido' };
  return { gerund: key + 'ando', pastParticiple: key + 'ado' };
}

/**
 * Fiil meta verisi: mastar, ulaç, geçmiş ortaç, kurallı mı, yardımcı fiil.
 */
export function getVerbMetadata(
  verbKey: string,
  lang: AppLanguage,
  isRegular: boolean
): VerbMetadata {
  const key = verbKey.trim().toLowerCase();
  const forms = lang === 'fr'
    ? (FR_FORMS[key] ?? placeholderForms(verbKey, 'fr'))
    : (ES_FORMS[key] ?? placeholderForms(verbKey, 'es'));
  const auxiliary = lang === 'fr' ? getFrenchAuxiliary(key) : getSpanishAuxiliary(key);
  return {
    infinitive: verbKey,
    gerund: forms.gerund,
    pastParticiple: forms.pastParticiple,
    isRegular,
    auxiliary,
  };
}
