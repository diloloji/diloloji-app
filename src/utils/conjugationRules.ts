/**
 * Hata analizi kartında kullanılan: bir fiil + zaman + zamir için
 * "neden bu şekilde çekimlendi?" sorusunu 1 cümleyle açıklayan kural üretici.
 *
 * Kural dizisi basit sezgisel yapıdadır: önce düzensiz fiil özel durumları,
 * ardından fiilin son hecesi (ör. -er, -ir, -re / -ar, -er, -ir) bakılarak
 * uygun ek/son bilgisi döndürülür. Bulunamazsa zamanın genel açıklamasına
 * düşer. Kart yalnızca öğretici bir ipucu verir; tam gramer referansı değildir.
 */

import type { AppLanguage } from '../data/verbs';
import { isIrregularVerb } from '../data/irregularVerbs';

/** Fransızca şahısa göre ek tabloları — yalnızca düzenli fiiller için yaklaşık değerlerdir. */
const FR_ENDINGS: Record<string, Partial<Record<'er' | 'ir' | 're', Record<string, string>>>> = {
  present: {
    er: { je: '-e', tu: '-es', il: '-e', nous: '-ons', vous: '-ez', ils: '-ent' },
    ir: { je: '-is', tu: '-is', il: '-it', nous: '-issons', vous: '-issez', ils: '-issent' },
    re: { je: '-s', tu: '-s', il: '-', nous: '-ons', vous: '-ez', ils: '-ent' },
  },
  imparfait: {
    er: { je: '-ais', tu: '-ais', il: '-ait', nous: '-ions', vous: '-iez', ils: '-aient' },
    ir: { je: '-issais', tu: '-issais', il: '-issait', nous: '-issions', vous: '-issiez', ils: '-issaient' },
    re: { je: '-ais', tu: '-ais', il: '-ait', nous: '-ions', vous: '-iez', ils: '-aient' },
  },
  'futur-simple': {
    er: { je: '-erai', tu: '-eras', il: '-era', nous: '-erons', vous: '-erez', ils: '-eront' },
    ir: { je: '-irai', tu: '-iras', il: '-ira', nous: '-irons', vous: '-irez', ils: '-iront' },
    re: { je: '-rai', tu: '-ras', il: '-ra', nous: '-rons', vous: '-rez', ils: '-ront' },
  },
  'subjonctif-present': {
    er: { je: '-e', tu: '-es', il: '-e', nous: '-ions', vous: '-iez', ils: '-ent' },
    ir: { je: '-isse', tu: '-isses', il: '-isse', nous: '-issions', vous: '-issiez', ils: '-issent' },
    re: { je: '-e', tu: '-es', il: '-e', nous: '-ions', vous: '-iez', ils: '-ent' },
  },
  'passe-simple': {
    er: { je: '-ai', tu: '-as', il: '-a', nous: '-âmes', vous: '-âtes', ils: '-èrent' },
    ir: { je: '-is', tu: '-is', il: '-it', nous: '-îmes', vous: '-îtes', ils: '-irent' },
    re: { je: '-is', tu: '-is', il: '-it', nous: '-îmes', vous: '-îtes', ils: '-irent' },
  },
};

/** İspanyolca şahısa göre düzenli fiil ek tabloları. */
const ES_ENDINGS: Record<string, Partial<Record<'ar' | 'er' | 'ir', Record<string, string>>>> = {
  presente: {
    ar: { yo: '-o', tu: '-as', el: '-a', nosotros: '-amos', vosotros: '-áis', ellos: '-an' },
    er: { yo: '-o', tu: '-es', el: '-e', nosotros: '-emos', vosotros: '-éis', ellos: '-en' },
    ir: { yo: '-o', tu: '-es', el: '-e', nosotros: '-imos', vosotros: '-ís', ellos: '-en' },
  },
  imperfecto: {
    ar: { yo: '-aba', tu: '-abas', el: '-aba', nosotros: '-ábamos', vosotros: '-abais', ellos: '-aban' },
    er: { yo: '-ía', tu: '-ías', el: '-ía', nosotros: '-íamos', vosotros: '-íais', ellos: '-ían' },
    ir: { yo: '-ía', tu: '-ías', el: '-ía', nosotros: '-íamos', vosotros: '-íais', ellos: '-ían' },
  },
  preterito: {
    ar: { yo: '-é', tu: '-aste', el: '-ó', nosotros: '-amos', vosotros: '-asteis', ellos: '-aron' },
    er: { yo: '-í', tu: '-iste', el: '-ió', nosotros: '-imos', vosotros: '-isteis', ellos: '-ieron' },
    ir: { yo: '-í', tu: '-iste', el: '-ió', nosotros: '-imos', vosotros: '-isteis', ellos: '-ieron' },
  },
  futuro: {
    ar: { yo: '-é', tu: '-ás', el: '-á', nosotros: '-emos', vosotros: '-éis', ellos: '-án' },
    er: { yo: '-é', tu: '-ás', el: '-á', nosotros: '-emos', vosotros: '-éis', ellos: '-án' },
    ir: { yo: '-é', tu: '-ás', el: '-á', nosotros: '-emos', vosotros: '-éis', ellos: '-án' },
  },
  condicional: {
    ar: { yo: '-ía', tu: '-ías', el: '-ía', nosotros: '-íamos', vosotros: '-íais', ellos: '-ían' },
    er: { yo: '-ía', tu: '-ías', el: '-ía', nosotros: '-íamos', vosotros: '-íais', ellos: '-ían' },
    ir: { yo: '-ía', tu: '-ías', el: '-ía', nosotros: '-íamos', vosotros: '-íais', ellos: '-ían' },
  },
  'subjuntivo-presente': {
    ar: { yo: '-e', tu: '-es', el: '-e', nosotros: '-emos', vosotros: '-éis', ellos: '-en' },
    er: { yo: '-a', tu: '-as', el: '-a', nosotros: '-amos', vosotros: '-áis', ellos: '-an' },
    ir: { yo: '-a', tu: '-as', el: '-a', nosotros: '-amos', vosotros: '-áis', ellos: '-an' },
  },
};

/** Fransızca zamanların kısa açıklamaları (fallback). */
const FR_FALLBACK: Record<string, string> = {
  present: 'Présent: şu anki eylemi anlatır; düzenli fiiller kök + kişiye özel eke göre çekilir.',
  imparfait: 'Imparfait: geçmişte süren veya alışkanlık eylem; kök "nous" formundan alınır ve -ais/-ait ekleri gelir.',
  'passe-compose': 'Passé Composé: avoir/être (présent) + participe passé; hareket/konum fiilleri être ile kurulur.',
  'passe-simple': 'Passé Simple: yazı dilinde bir kez olup bitmiş eylem; şahıs eki fiilin grubuna göre değişir.',
  'futur-simple': 'Futur Simple: mastarın tamamı + -ai, -as, -a, -ons, -ez, -ont; bazı düzensizlerde kök değişir.',
  'subjonctif-present': 'Subjonctif Présent: "ils" présent kökünden dilek eki (-e, -es, -e, -ions, -iez, -ent) alır.',
};

/** İspanyolca zamanların kısa açıklamaları (fallback). */
const ES_FALLBACK: Record<string, string> = {
  presente: 'Presente: şu anki ya da genel eylem; kök + kişiye özel eke göre çekilir.',
  imperfecto: 'Imperfecto: geçmişte süren veya alışkanlık; -ar için -aba-, -er/-ir için -ía- kökü kullanılır.',
  preterito: 'Pretérito Indefinido: geçmişte bir kez tamamlanmış eylem; bazı fiillerde kök düzensizleşir.',
  'preterito-perfecto': 'Pretérito Perfecto: haber (presente) + participio; bugün/bu hafta gibi süren dönemlerde kullanılır.',
  pluscuamperfecto: 'Pluscuamperfecto: había + participio; geçmişteki bir eylemden önce olmuş eylemi anlatır.',
  futuro: 'Futuro Simple: mastarın tamamı + -é, -ás, -á, -emos, -éis, -án; bazı köklerde düzensizlik olur.',
  'futuro-compuesto': 'Futuro Compuesto: habré + participio; gelecekte tamamlanmış olacak eylemi anlatır.',
  condicional: 'Condicional: mastar + -ía ekleri; koşul veya nazik istek bildirir.',
  'subjuntivo-presente': 'Subjuntivo Presente: "yo" presente kökünden zıt sesli harf ekleri (-e / -a) alır.',
};

/** Fransızca düzensiz yo/zozo-durumları için nokta atışı kurallar (kısa ve öğretici). */
const FR_IRREGULAR_NOTES: Record<string, string> = {
  etre: 'Être tamamen düzensizdir: je suis, tu es, il est… ezberlenir.',
  'être': 'Être tamamen düzensizdir: je suis, tu es, il est… ezberlenir.',
  avoir: 'Avoir düzensizdir: j\'ai, tu as, il a… ezberlenir.',
  aller: 'Aller düzensizdir: je vais, tu vas, il va… kök présentte "v-"/"all-" arasında değişir.',
  faire: 'Faire düzensizdir: nous faisons, vous faites, ils font — "vous faites" ezberlenmelidir.',
  venir: 'Venir kökü "vien-/ven-/viennent" biçiminde değişir; 3. çoğulda çift "n" gelir.',
  prendre: 'Prendre çoğulda "n" düşer: nous prenons, ils prennent; kök dönüşümü ezberlenir.',
  pouvoir: 'Pouvoir düzensizdir: je peux, tu peux, il peut… "peu-/pouv-/peuv-" kök değişimi vardır.',
  vouloir: 'Vouloir düzensizdir: je veux, tu veux, il veut… "veu-/voul-/veul-" kök değişimi vardır.',
  savoir: 'Savoir düzensizdir: je sais, tu sais, il sait… "sa-/sav-" kökleri değişir.',
  voir: 'Voir düzensizdir: nous voyons, ils voient — kök "voi-/voy-" arasında değişir.',
  dire: 'Dire düzensizdir: vous dites (istisna), ils disent.',
  mettre: 'Mettre: tekil şahıslarda bir "t" düşer: je mets, tu mets, il met.',
};

/** İspanyolca düzensiz fiiller için nokta atışı kurallar. */
const ES_IRREGULAR_NOTES: Record<string, string> = {
  ser: 'Ser tamamen düzensizdir: yo soy, tú eres, él es… ezberlenir.',
  estar: 'Estar düzensizdir: yo estoy, tú estás, él está… yo formu "-oy" alır.',
  tener: 'Tener yo formunda "tengo"; e→ie kök değişimi olur (tengo, tienes, tiene).',
  hacer: 'Hacer yo formunda "hago" olur; pretéritoda kök "hic-/hiz-" biçimine döner.',
  ir: 'Ir tamamen düzensizdir: voy, vas, va, vamos, vais, van.',
  decir: 'Decir yo formunda "digo"; e→i kök değişimi olur (digo, dices, dice).',
  poder: 'Poder o→ue kök değişimi gösterir: puedo, puedes, puede, podemos, podéis, pueden.',
  venir: 'Venir yo formunda "vengo"; e→ie kök değişimi vardır (vengo, vienes, viene).',
  poner: 'Poner yo formunda "pongo" olur; pretérito "puse, pusiste…" biçiminde kökü değişir.',
  ver: 'Ver yo formunda "veo"; imperfectoda "veía" biçiminde düzensizdir.',
  saber: 'Saber yo formunda "sé" olur; presentte sadece 1. tekil düzensizdir.',
  salir: 'Salir yo formunda "salgo"; -g- ekler (salgo, sales, sale).',
};

function isYoZcoVerb(verb: string): boolean {
  const v = verb.toLowerCase();
  return v.endsWith('ducir') || v.endsWith('cer') || v.endsWith('cir');
}

function getEndingKeyFr(verb: string): 'er' | 'ir' | 're' | null {
  const v = verb.toLowerCase();
  if (v.endsWith('er')) return 'er';
  if (v.endsWith('ir')) return 'ir';
  if (v.endsWith('re')) return 're';
  return null;
}

function getEndingKeyEs(verb: string): 'ar' | 'er' | 'ir' | null {
  const v = verb.toLowerCase();
  if (v.endsWith('ar')) return 'ar';
  if (v.endsWith('er')) return 'er';
  if (v.endsWith('ir')) return 'ir';
  return null;
}

/**
 * Verilen fiil + zaman + zamir için 1 cümlelik kural açıklaması döner.
 * Açıklama: "reduzco: -ducir ile biten fiiller yo formunda -zco alır" tarzıdır.
 */
export function getConjugationRule(
  verb: string,
  tense: string,
  pronoun: string,
  lang: AppLanguage,
  correctValue?: string
): string {
  const v = verb.toLowerCase().trim();

  if (lang === 'es') {
    if (tense === 'presente' && pronoun === 'yo' && isYoZcoVerb(v)) {
      if (v.endsWith('ducir')) {
        return `${correctValue ?? ''}: -ducir ile biten fiiller yo formunda "-zco" alır (conducir → conduzco).`.trim();
      }
      if (v.endsWith('cer') || v.endsWith('cir')) {
        return `${correctValue ?? ''}: sesli harften sonra -cer/-cir ile biten fiiller yo formunda "-zco" alır (conocer → conozco).`.trim();
      }
    }
    if (ES_IRREGULAR_NOTES[v]) return ES_IRREGULAR_NOTES[v];

    if (tense === 'preterito-perfecto') {
      return `Pretérito Perfecto: haber (presente) + participio (-ado / -ido).`;
    }
    if (tense === 'pluscuamperfecto') {
      return `Pluscuamperfecto: haber imperfectoda "había, habías…" + participio ile kurulur.`;
    }
    if (tense === 'futuro-compuesto') {
      return `Futuro Compuesto: haber "habré, habrás…" + participio ile kurulur.`;
    }
    const key = getEndingKeyEs(v);
    const table = ES_ENDINGS[tense];
    if (key && table && table[key] && table[key]?.[pronoun]) {
      const suffix = table[key]![pronoun];
      return `Düzenli -${key} fiilleri ${ES_FALLBACK[tense] ? tense.replace(/-/g, ' ') : tense} zamanında ${pronoun} için "${suffix}" eki alır.`;
    }
    return ES_FALLBACK[tense] ?? 'Bu fiil düzensiz kök/ek değişimi gösteriyor olabilir.';
  }

  if (FR_IRREGULAR_NOTES[v]) return FR_IRREGULAR_NOTES[v];
  if (isIrregularVerb(v, 'fr')) {
    return `${v} düzensiz bir fiildir: kök ve/veya ekleri standart -er/-ir/-re kalıbından sapabilir.`;
  }

  if (tense === 'passe-compose') {
    const ending = getEndingKeyFr(v);
    if (ending === 'er') return `Passé Composé: avoir (présent) + participe passé; -er fiillerin ortacı "-é" ile biter (parler → parlé).`;
    if (ending === 'ir') return `Passé Composé: avoir/être (présent) + participe passé; -ir fiillerin ortacı genelde "-i" ile biter (finir → fini).`;
    if (ending === 're') return `Passé Composé: avoir/être (présent) + participe passé; -re fiillerin ortacı genelde "-u" ile biter (vendre → vendu).`;
    return FR_FALLBACK['passe-compose'];
  }

  const key = getEndingKeyFr(v);
  const table = FR_ENDINGS[tense];
  if (key && table && table[key] && table[key]?.[pronoun]) {
    const suffix = table[key]![pronoun];
    return `Düzenli -${key} fiilleri ${tense} zamanında ${pronoun} için "${suffix}" eki alır.`;
  }
  return FR_FALLBACK[tense] ?? 'Bu fiil düzensiz kök/ek değişimi gösteriyor olabilir.';
}
