/**
 * Fiil Laboratuvarı — örnek cümle veritabanı (en çok kullanılan fiiller).
 * verbKey (infinitive) → { sentence, translation }
 */

export type VerbExample = {
  sentence: string;
  translation: string;
};

export type VerbExamplesByLang = Record<string, VerbExample>;

export const VERB_EXAMPLES: Record<'fr' | 'es', VerbExamplesByLang> = {
  fr: {
    être: {
      sentence: 'Je suis étudiant.',
      translation: 'Ben bir öğrenciyim.',
    },
    avoir: {
      sentence: 'J\'ai une idée.',
      translation: 'Bir fikrim var.',
    },
    faire: {
      sentence: 'Nous faisons nos devoirs.',
      translation: 'Ödevlerimizi yapıyoruz.',
    },
    aller: {
      sentence: 'Ils vont au cinéma ce soir.',
      translation: 'Bu akşam sinemaya gidiyorlar.',
    },
    venir: {
      sentence: 'Elle vient de Paris.',
      translation: 'O Paris\'ten geliyor.',
    },
  },
  es: {
    ser: {
      sentence: 'Soy estudiante.',
      translation: 'Ben bir öğrenciyim.',
    },
    estar: {
      sentence: 'Estamos en la biblioteca.',
      translation: 'Kütüphanedeyiz.',
    },
    tener: {
      sentence: 'Tengo dos hermanos.',
      translation: 'İki kardeşim var.',
    },
    hacer: {
      sentence: '¿Qué haces esta tarde?',
      translation: 'Bu öğleden sonra ne yapıyorsun?',
    },
    ir: {
      sentence: 'Voy al mercado los sábados.',
      translation: 'Cumartesi günleri pazara giderim.',
    },
  },
};

/** Seçilen dil ve fiil anahtarına göre örnek cümle döner; yoksa null. */
export function getVerbExample(
  lang: 'fr' | 'es',
  verbKey: string
): VerbExample | null {
  const key = verbKey.trim().toLowerCase();
  const byLang = VERB_EXAMPLES[lang];
  if (!byLang || !key) return null;
  return byLang[key] ?? null;
}
