/**
 * Seviyeye Göre Fiil Listeleri — İspanyolca & Fransızca
 * CEFR A1 → C1 hiyerarşik sıralaması, en sık kullanımdan ileriye.
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type VerbLang = 'es' | 'fr';

type LevelMap = Record<CEFRLevel, string[]>;

const ES_VERBS: LevelMap = {
  A1: [
    'ser', 'estar', 'tener', 'hacer', 'ir',
    'venir', 'poder', 'querer', 'hablar', 'comer',
    'vivir', 'llamarse', 'trabajar', 'estudiar', 'necesitar',
    'gustar', 'dar', 'ver', 'saber', 'conocer',
  ],
  A2: [
    'llegar', 'salir', 'poner', 'traer', 'seguir',
    'llevar', 'pensar', 'decir', 'encontrar', 'buscar',
    'comprar', 'pagar', 'esperar', 'empezar', 'volver',
    'abrir', 'cerrar', 'leer', 'escuchar', 'escribir',
  ],
  B1: [
    'conseguir', 'resultar', 'parecer', 'quedar', 'perder',
    'ganar', 'intentar', 'sentir', 'recordar', 'olvidar',
    'cambiar', 'crecer', 'entender', 'aprender', 'enseñar',
    'producir', 'permitir', 'deber', 'surgir', 'reunirse',
  ],
  B2: [
    'tratar', 'suponer', 'establecer', 'reconocer', 'afirmar',
    'mejorar', 'reducir', 'desarrollar', 'construir', 'demostrar',
    'insistir', 'proponer', 'resolver', 'convencer', 'preocupar',
    'destacar', 'señalar', 'describir', 'comparar', 'analizar',
  ],
  C1: [
    'contradecir', 'predecir', 'prescindir', 'sobrepasar', 'abstraer',
    'discernir', 'prevalecer', 'suscitar', 'matizar', 'aludir',
    'transgredir', 'obviar', 'subyacer', 'plantear', 'contemplar',
    'precisar', 'abordar', 'concebir', 'inferir', 'dilucidarse',
  ],
};

const FR_VERBS: LevelMap = {
  A1: [
    'être', 'avoir', 'faire', 'aller', 'venir',
    'pouvoir', 'vouloir', 'devoir', 'parler', 'manger',
    'habiter', 'travailler', 'étudier', 'aimer', 'regarder',
    'écouter', 'prendre', 'mettre', 'voir', 'savoir',
  ],
  A2: [
    'arriver', 'partir', 'sortir', 'entrer', 'rentrer',
    'penser', 'trouver', 'chercher', 'demander', 'répondre',
    'commencer', 'finir', 'attendre', 'lire', 'écrire',
    'ouvrir', 'fermer', 'payer', 'porter', 'choisir',
  ],
  B1: [
    'sembler', 'rester', 'perdre', 'gagner', 'essayer',
    'comprendre', 'apprendre', 'reconnaître', 'oublier', 'souvenir',
    'changer', 'permettre', 'produire', 'résoudre', 'réunir',
    'paraître', 'appartenir', 'bâtir', 'remplir', 'soutenir',
  ],
  B2: [
    'établir', 'développer', 'construire', 'proposer', 'affirmer',
    'améliorer', 'réduire', 'convaincre', 'insister', 'démontrer',
    'souligner', 'préciser', 'analyser', 'comparer', 'décrire',
    'distinguer', 'aborder', 'exprimer', 'concevoir', 'prévoir',
  ],
  C1: [
    'présupposer', 'contredire', 'transgresser', 'abstraire', 'prédire',
    'discerner', 'susciter', 'prévaloir', 'nuancer', 'alléguer',
    'sous-entendre', 's\'avérer', 'contraindre', 'appréhender', 'percevoir',
    'envisager', 'déceler', 'infléchir', 'circonscrire', 'élucider',
  ],
};

export const VERB_LEVELS: Record<VerbLang, LevelMap> = {
  es: ES_VERBS,
  fr: FR_VERBS,
};

export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export const CEFR_COLORS: Record<CEFRLevel, { btn: string; chip: string }> = {
  A1: {
    btn: 'border-emerald-500/60 bg-emerald-500 text-white shadow-emerald-500/25',
    chip: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50',
  },
  A2: {
    btn: 'border-teal-500/60 bg-teal-500 text-white shadow-teal-500/25',
    chip: 'bg-teal-500/10 border-teal-500/25 text-teal-300 hover:bg-teal-500/20 hover:border-teal-500/50',
  },
  B1: {
    btn: 'border-blue-500/60 bg-blue-500 text-white shadow-blue-500/25',
    chip: 'bg-blue-500/10 border-blue-500/25 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/50',
  },
  B2: {
    btn: 'border-violet-500/60 bg-violet-500 text-white shadow-violet-500/25',
    chip: 'bg-violet-500/10 border-violet-500/25 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/50',
  },
  C1: {
    btn: 'border-rose-500/60 bg-rose-500 text-white shadow-rose-500/25',
    chip: 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50',
  },
};
