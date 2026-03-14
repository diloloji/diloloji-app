/**
 * İspanyolca dil verileri: zamirler, zamanlar, yaygın fiiller.
 * spanish-verbs kütüphanesi person: 0=yo, 1=tú, 2=él, 3=nosotros, 4=vosotros, 5=ellos.
 */

export type PronounEs = 'yo' | 'tu' | 'el' | 'nosotros' | 'vosotros' | 'ellos';

export type TenseIdEs =
  | 'presente'
  | 'imperfecto'
  | 'preterito'
  | 'preterito-perfecto'
  | 'pluscuamperfecto'
  | 'futuro'
  | 'futuro-compuesto'
  | 'subjuntivo-presente'
  | 'condicional';

export const PRONOUNS_ES: { id: PronounEs; label: string }[] = [
  { id: 'yo', label: 'Yo' },
  { id: 'tu', label: 'Tú' },
  { id: 'el', label: 'Él/Ella/Ud.' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'vosotros', label: 'Vosotros' },
  { id: 'ellos', label: 'Ellos/Ellas/Uds.' },
];

export const TENSES_ES: { id: TenseIdEs; label: string }[] = [
  { id: 'presente', label: 'Presente' },
  { id: 'imperfecto', label: 'Pretérito Imperfecto' },
  { id: 'preterito', label: 'Pretérito Indefinido' },
  { id: 'preterito-perfecto', label: 'Pretérito Perfecto (haber + participio)' },
  { id: 'pluscuamperfecto', label: 'Pluscuamperfecto (había + participio)' },
  { id: 'futuro', label: 'Futuro Simple' },
  { id: 'futuro-compuesto', label: 'Futuro Compuesto (habré + participio)' },
  { id: 'condicional', label: 'Condicional' },
  { id: 'subjuntivo-presente', label: 'Subjuntivo Presente' },
];

export const TENSE_GROUPS_ES: { mood: string; label: string; tenseIds: TenseIdEs[] }[] = [
  {
    mood: 'indicativo',
    label: 'El Indicativo (Haber Kipi)',
    tenseIds: ['presente', 'imperfecto', 'preterito', 'preterito-perfecto', 'pluscuamperfecto', 'futuro', 'futuro-compuesto', 'condicional'],
  },
  {
    mood: 'subjonctif',
    label: 'El Subjuntivo (Dilek Kipi)',
    tenseIds: ['subjuntivo-presente'],
  },
];

/** En sık kullanılan İspanyolca fiiller (ser, estar, tener, hacer vb.) */
export const COMMON_SPANISH_VERBS = [
  'ser',
  'estar',
  'tener',
  'hacer',
  'ir',
  'decir',
  'poder',
  'ver',
  'querer',
  'venir',
  'saber',
  'hablar',
  'comer',
  'vivir',
  'escribir',
  'leer',
  'dar',
  'pensar',
  'entender',
  'empezar',
  'llegar',
  'deber',
  'poner',
  'salir',
  'volver',
  'conocer',
  'sentir',
  'pedir',
  'dormir',
  'servir',
  'repetir',
  'seguir',
  'conseguir',
  'encontrar',
  'contar',
  'costar',
  'jugar',
  'llamar',
  'trabajar',
  'estudiar',
  'ayudar',
  'pagar',
  'buscar',
  'sacar',
  'tomar',
  'dejar',
  'llevar',
  'pasar',
  'creer',
  'abrir',
  'recibir',
  'subir',
  'bajar',
  'cerrar',
  'perder',
  'entrar',
  'tratar',
  'ganar',
  'cambiar',
  'preparar',
  'usar',
  'acabar',
  'aceptar',
  'permitir',
  'decidir',
  'ocurrir',
  'comprender',
  'ofrecer',
  'recordar',
  'terminar',
  'necesitar',
  'mantener',
  'aparecer',
  'comprar',
  'vender',
  'correr',
  'aprender',
  'responder',
  'existir',
  'cumplir',
  'sufrir',
  'describir',
  'producir',
  'traducir',
  'conducir',
  'construir',
  'distinguir',
  'elegir',
  'recoger',
  'proteger',
  'dirigir',
  'exigir',
  'fingir',
  'perseguir',
  'corregir',
  'erguir',
] as const;

export function getRandomVerbSpanish(exclude?: string): string {
  const list = COMMON_SPANISH_VERBS as unknown as string[];
  if (!exclude || list.length <= 1) {
    const i = Math.floor(Math.random() * list.length);
    return list[i];
  }
  const normalizedExclude = exclude.trim().toLowerCase();
  for (let attempt = 0; attempt < 25; attempt++) {
    const i = Math.floor(Math.random() * list.length);
    const v = list[i];
    if (v.toLowerCase() !== normalizedExclude) return v;
  }
  return list[Math.floor(Math.random() * list.length)];
}

/** İspanyolca fiil listesi (otomatik tamamlama için) */
export function getVerbListSpanish(): string[] {
  return [...COMMON_SPANISH_VERBS];
}
