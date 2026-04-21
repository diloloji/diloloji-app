/**
 * hint_rules — Akıllı İpucu Sistemi için yapısal kural veritabanı.
 *
 * Her entry: belirli bir (zaman + fiil-tipi + kişi) kombinasyonu için 1 cümlelik
 * öğretici kural ve örnek. Kural metni hata yapan kullanıcıya 1. ipucuda gösterilir.
 *
 * verb_type:
 *   - "ser-ir-shared", "tener-family", "ducir-yo", "go-yo" gibi belirli desenler veya
 *   - "-ar regular", "-er regular", "-ir regular" düzenli aileler
 *   - "-ar irregular", "-er irregular", "-ir irregular" genel düzensiz çatılar
 *
 * Eşleştirme öncelik sırası (hintEngine.ts):
 *   1. Belirli fiil/desen tabanlı entry (verbs içerir)
 *   2. Düzensiz tipi entry
 *   3. Düzenli tipi entry
 *   4. conjugationRules.getConjugationRule fallback
 */

import type { TenseIdEs, PronounEs } from './spanish';

export type EsHintRule = {
  /** Hangi zamana ait — TenseIdEs id'si. */
  tense: TenseIdEs;
  /** Açıklayıcı tip etiketi (UI'de gösterilebilir). */
  verb_type: string;
  /** Hangi kişi(ler) için geçerli — boşsa tüm kişiler için. */
  person?: PronounEs[];
  /** Belirli mastarlar için geçerliyse — boşsa tip eşleşmesine bakılır. */
  verbs?: string[];
  /** Hangi mastar ekleriyle biten fiiller için ('ar' | 'er' | 'ir' | 'ducir' | 'cer' | 'cir' | 'gir' | 'guir' | 'car' | 'gar' | 'zar') */
  ending?: string[];
  /** 1 cümlelik öğretici kural. */
  rule: string;
  /** İsteğe bağlı örnek (mastar → çekim). */
  example?: string;
};

export const ES_HINT_RULES: EsHintRule[] = [
  /* ───────────── Presente ───────────── */
  {
    tense: 'presente',
    verb_type: '-ar regular',
    ending: ['ar'],
    rule: 'Presente: -ar fiilleri yo/tú/él/nos/vos/ellos formlarında -o, -as, -a, -amos, -áis, -an alır.',
    example: 'hablar → hablo, hablas, habla, hablamos, habláis, hablan',
  },
  {
    tense: 'presente',
    verb_type: '-er regular',
    ending: ['er'],
    rule: 'Presente: -er fiilleri -o, -es, -e, -emos, -éis, -en eklerini alır.',
    example: 'comer → como, comes, come, comemos, coméis, comen',
  },
  {
    tense: 'presente',
    verb_type: '-ir regular',
    ending: ['ir'],
    rule: 'Presente: -ir fiilleri -o, -es, -e, -imos, -ís, -en eklerini alır (1./2. çoğul -er\'den ayrılır).',
    example: 'vivir → vivo, vives, vive, vivimos, vivís, viven',
  },
  {
    tense: 'presente',
    verb_type: 'ducir-yo (-zco)',
    person: ['yo'],
    ending: ['ducir'],
    rule: 'Presente yo formunda -ducir ile biten fiiller -zco alır.',
    example: 'reducir → reduzco; conducir → conduzco',
  },
  {
    tense: 'presente',
    verb_type: 'cer/cir-yo (-zco)',
    person: ['yo'],
    ending: ['cer', 'cir'],
    rule: 'Presente yo formunda ünlü+cer/cir biten fiiller -zco alır.',
    example: 'conocer → conozco; parecer → parezco',
  },
  {
    tense: 'presente',
    verb_type: 'go-yo (1. tekil -go)',
    person: ['yo'],
    verbs: ['tener', 'venir', 'poner', 'salir', 'hacer', 'decir', 'traer', 'caer', 'oír', 'valer'],
    rule: 'Bu fiil presente yo formunda -go alır (düzensiz 1. tekil).',
    example: 'tener → tengo; venir → vengo; hacer → hago; decir → digo',
  },
  {
    tense: 'presente',
    verb_type: 'oy-yo (özel düzensiz)',
    person: ['yo'],
    verbs: ['ser', 'estar', 'ir', 'dar'],
    rule: 'Bu fiil presente yo formunda -oy alır (tamamen düzensiz).',
    example: 'ser → soy; estar → estoy; ir → voy; dar → doy',
  },
  {
    tense: 'presente',
    verb_type: 'e→ie kök değişimi',
    person: ['yo', 'tu', 'el', 'ellos'],
    verbs: ['querer', 'pensar', 'cerrar', 'empezar', 'comenzar', 'entender', 'perder', 'preferir', 'sentir', 'tener', 'venir', 'despertar', 'sentar', 'encender', 'defender', 'divertir', 'consentir', 'advertir'],
    rule: 'Vurgulu hecede e → ie kök değişir (yo/tú/él/ellos); biz/siz formunda kök sabit kalır.',
    example: 'querer → quiero, quieres, quiere, queremos, queréis, quieren',
  },
  {
    tense: 'presente',
    verb_type: 'o→ue kök değişimi',
    person: ['yo', 'tu', 'el', 'ellos'],
    verbs: ['poder', 'volver', 'dormir', 'mostrar', 'recordar', 'encontrar', 'contar', 'mover', 'sonar', 'soñar', 'morir', 'almorzar', 'apostar', 'acostar', 'probar', 'doler', 'llover', 'resolver', 'demostrar', 'concordar', 'aprobar', 'promover'],
    rule: 'Vurgulu hecede o → ue kök değişir (yo/tú/él/ellos); biz/siz formunda kök sabit kalır.',
    example: 'poder → puedo, puedes, puede, podemos, podéis, pueden',
  },
  {
    tense: 'presente',
    verb_type: 'e→i kök değişimi',
    person: ['yo', 'tu', 'el', 'ellos'],
    verbs: ['pedir', 'servir', 'repetir', 'seguir', 'vestir', 'elegir', 'reír', 'medir', 'conseguir', 'impedir'],
    rule: '-ir fiillerinde vurgulu hecede e → i kök değişir (yo/tú/él/ellos).',
    example: 'pedir → pido, pides, pide, pedimos, pedís, piden',
  },
  {
    tense: 'presente',
    verb_type: 'u→ue (jugar)',
    person: ['yo', 'tu', 'el', 'ellos'],
    verbs: ['jugar'],
    rule: 'Jugar tek u → ue kök değişimine sahip fiildir (vurgulu hecede).',
    example: 'jugar → juego, juegas, juega, jugamos, jugáis, juegan',
  },
  {
    tense: 'presente',
    verb_type: '-uir (y eklenir)',
    person: ['yo', 'tu', 'el', 'ellos'],
    ending: ['uir'],
    rule: '-uir biten fiiller (construir gibi) sesli ekler önünde araya y koyar.',
    example: 'construir → construyo, construyes, construye, construimos, construís, construyen',
  },

  /* ───────────── Pretérito Indefinido ───────────── */
  {
    tense: 'preterito',
    verb_type: '-ar regular',
    ending: ['ar'],
    rule: 'Indefinido: -ar fiilleri -é, -aste, -ó, -amos, -asteis, -aron alır.',
    example: 'hablar → hablé, hablaste, habló, hablamos, hablasteis, hablaron',
  },
  {
    tense: 'preterito',
    verb_type: '-er/-ir regular',
    ending: ['er', 'ir'],
    rule: 'Indefinido: -er ve -ir fiilleri aynı eki alır: -í, -iste, -ió, -imos, -isteis, -ieron.',
    example: 'comer → comí, comiste, comió, comimos, comisteis, comieron',
  },
  {
    tense: 'preterito',
    verb_type: 'ser/ir aynı çekim',
    verbs: ['ser', 'ir'],
    rule: 'Pretérito Indefinido\'da ser ve ir tamamen aynı çekimi paylaşır.',
    example: 'fui, fuiste, fue, fuimos, fuisteis, fueron',
  },
  {
    tense: 'preterito',
    verb_type: 'düzensiz kök (-uv-/-us-/-ij-)',
    verbs: ['tener', 'estar', 'andar', 'poder', 'poner', 'saber', 'haber', 'querer', 'venir', 'hacer', 'decir', 'traer', 'conducir', 'producir', 'reducir', 'traducir'],
    rule: 'Bu fiil pretérito\'da düzensiz kök alır; ekler -e, -iste, -o, -imos, -isteis, -ieron biçimindedir (aksan yok).',
    example: 'tener → tuve, tuviste, tuvo; decir → dije, dijiste, dijo, …, dijeron',
  },
  {
    tense: 'preterito',
    verb_type: 'i→y (3. kişi)',
    person: ['el', 'ellos'],
    verbs: ['leer', 'creer', 'caer', 'oír', 'construir', 'incluir', 'huir', 'destruir', 'sustituir', 'disminuir'],
    rule: 'Pretérito 3. tekil/çoğulda iki ünlü arası i → y dönüşür.',
    example: 'leer → leyó, leyeron; construir → construyó, construyeron',
  },
  {
    tense: 'preterito',
    verb_type: 'e→i (3. kişi -ir kök değişen)',
    person: ['el', 'ellos'],
    verbs: ['pedir', 'servir', 'repetir', 'seguir', 'vestir', 'sentir', 'preferir', 'divertir', 'dormir', 'morir', 'reír', 'elegir', 'consentir', 'advertir', 'impedir', 'medir'],
    rule: '-ir kök-değişen fiillerde pretérito 3. tekil/çoğulda kök e→i (veya o→u) olur.',
    example: 'pedir → pidió, pidieron; dormir → durmió, durmieron',
  },
  {
    tense: 'preterito',
    verb_type: 'yo: -car/-gar/-zar yazım',
    person: ['yo'],
    ending: ['car', 'gar', 'zar'],
    rule: 'Yazım koruması: -car → -qué, -gar → -gué, -zar → -cé olur (yo formunda).',
    example: 'buscar → busqué; pagar → pagué; empezar → empecé',
  },

  /* ───────────── Pretérito Imperfecto ───────────── */
  {
    tense: 'imperfecto',
    verb_type: '-ar regular',
    ending: ['ar'],
    rule: 'Imperfecto: -ar fiilleri -aba, -abas, -aba, -ábamos, -abais, -aban alır.',
    example: 'hablar → hablaba, hablabas, hablaba, hablábamos, hablabais, hablaban',
  },
  {
    tense: 'imperfecto',
    verb_type: '-er/-ir regular',
    ending: ['er', 'ir'],
    rule: 'Imperfecto: -er ve -ir fiilleri -ía, -ías, -ía, -íamos, -íais, -ían alır (aynı çekim).',
    example: 'comer → comía, comías, comía, comíamos, comíais, comían',
  },
  {
    tense: 'imperfecto',
    verb_type: 'ser/ir/ver — düzensiz',
    verbs: ['ser', 'ir', 'ver'],
    rule: 'Imperfecto\'da yalnızca üç düzensiz fiil vardır: ser (era), ir (iba), ver (veía).',
    example: 'ser → era; ir → iba; ver → veía',
  },

  /* ───────────── Futuro Simple ───────────── */
  {
    tense: 'futuro',
    verb_type: 'düzenli (mastar + ek)',
    rule: 'Futuro Simple: mastarın tamamı + -é, -ás, -á, -emos, -éis, -án eklerini alır.',
    example: 'hablar → hablaré, hablarás, hablará, hablaremos, hablaréis, hablarán',
  },
  {
    tense: 'futuro',
    verb_type: 'düzensiz kök',
    verbs: ['tener', 'poner', 'salir', 'venir', 'poder', 'saber', 'haber', 'querer', 'hacer', 'decir', 'caber', 'valer', 'mantener', 'detener', 'sostener', 'retener', 'obtener', 'componer', 'disponer', 'exponer', 'proponer', 'imponer', 'oponer', 'suponer', 'entretener'],
    rule: 'Bu fiilin futuro/condicional kökü düzensizleşir (örn. tener → tendr-, hacer → har-).',
    example: 'tener → tendré, tendrás…; hacer → haré, harás…; decir → diré, dirás…',
  },

  /* ───────────── Condicional ───────────── */
  {
    tense: 'condicional',
    verb_type: 'düzenli (mastar + -ía)',
    rule: 'Condicional: mastarın tamamı + -ía, -ías, -ía, -íamos, -íais, -ían eklerini alır.',
    example: 'hablar → hablaría, hablarías, hablaría, hablaríamos, hablaríais, hablarían',
  },
  {
    tense: 'condicional',
    verb_type: 'düzensiz kök (futuro ile aynı)',
    verbs: ['tener', 'poner', 'salir', 'venir', 'poder', 'saber', 'haber', 'querer', 'hacer', 'decir', 'caber', 'valer', 'mantener', 'detener', 'sostener', 'retener', 'obtener', 'componer', 'disponer', 'exponer', 'proponer', 'imponer', 'oponer', 'suponer', 'entretener'],
    rule: 'Condicional\'da kök futuro ile aynıdır; ekler -ía, -ías, -ía, -íamos, -íais, -ían.',
    example: 'tener → tendría; hacer → haría; decir → diría',
  },

  /* ───────────── Subjuntivo Presente ───────────── */
  {
    tense: 'subjuntivo-presente',
    verb_type: '-ar → -e ekleri',
    ending: ['ar'],
    rule: 'Subjuntivo Presente: -ar fiilleri zıt ünlü -e alır: -e, -es, -e, -emos, -éis, -en.',
    example: 'hablar → hable, hables, hable, hablemos, habléis, hablen',
  },
  {
    tense: 'subjuntivo-presente',
    verb_type: '-er/-ir → -a ekleri',
    ending: ['er', 'ir'],
    rule: 'Subjuntivo Presente: -er ve -ir fiilleri zıt ünlü -a alır: -a, -as, -a, -amos, -áis, -an.',
    example: 'comer → coma, comas, coma; vivir → viva, vivas, viva',
  },
  {
    tense: 'subjuntivo-presente',
    verb_type: 'yo presente kökünden türer',
    rule: 'Subjuntivo kökü presente "yo" formundan alınır; -o atılır, zıt ünlü eki gelir.',
    example: 'tener (tengo) → tenga, tengas…; conocer (conozco) → conozca, conozcas…',
  },
  {
    tense: 'subjuntivo-presente',
    verb_type: 'tamamen düzensiz',
    verbs: ['ser', 'estar', 'ir', 'haber', 'saber', 'dar'],
    rule: 'Bu fiilin subjuntivo kökü tamamen düzensizdir; ezberlenir.',
    example: 'ser → sea; estar → esté; ir → vaya; haber → haya; saber → sepa; dar → dé',
  },

  /* ───────────── Pretérito Perfecto / Pluscuamperfecto / Futuro Compuesto ───────────── */
  {
    tense: 'preterito-perfecto',
    verb_type: 'haber + participio',
    rule: 'Pretérito Perfecto: haber\'in presente çekimi (he, has, ha, hemos, habéis, han) + participio.',
    example: 'comer → he comido, has comido, ha comido…',
  },
  {
    tense: 'pluscuamperfecto',
    verb_type: 'haber (imperfecto) + participio',
    rule: 'Pluscuamperfecto: haber\'in imperfecto çekimi (había, habías…) + participio.',
    example: 'comer → había comido, habías comido…',
  },
  {
    tense: 'futuro-compuesto',
    verb_type: 'haber (futuro) + participio',
    rule: 'Futuro Compuesto: haber\'in futuro çekimi (habré, habrás…) + participio.',
    example: 'comer → habré comido, habrás comido…',
  },
];
