/**
 * Fiil Laboratuvarı — hızlı anlam ve eş anlamlılar (mock, API öncesi yer tutucu).
 */

import type { AppLanguage } from './verbs';

type Entry = { meaning: string; synonyms: string };

const FR: Record<string, Entry> = {
  avoir: { meaning: 'sahip olmak', synonyms: 'elde etmek; edinmek; içermek; bulunmak' },
  être: { meaning: 'olmak', synonyms: 'bulunmak; mevcut olmak; -dır/-dir' },
  faire: { meaning: 'yapmak', synonyms: 'etmek; gerçekleştirmek; üretmek' },
  aller: { meaning: 'gitmek', synonyms: 'yönelmek; uğramak; işe yaramak' },
  venir: { meaning: 'gelmek', synonyms: 'ulaşmak; kaynaklanmak; -den gelmek' },
  parler: { meaning: 'konuşmak', synonyms: 'söylemek; ifade etmek' },
  finir: { meaning: 'bitirmek', synonyms: 'tamamlamak; sona erdirmek' },
};

const ES: Record<string, Entry> = {
  ser: { meaning: 'olmak', synonyms: 'bulunmak; -dır/-dir; kökeni olmak' },
  estar: { meaning: 'olmak (durum)', synonyms: 'bulunmak; hissetmek' },
  tener: { meaning: 'sahip olmak', synonyms: 'içermek; elde etmek; tutmak' },
  hacer: { meaning: 'yapmak', synonyms: 'etmek; üretmek; oluşturmak' },
  ir: { meaning: 'gitmek', synonyms: 'yönelmek; uğramak; devam etmek' },
  hablar: { meaning: 'konuşmak', synonyms: 'söylemek; ifade etmek' },
  comer: { meaning: 'yemek', synonyms: 'yemek yemek; tüketmek' },
};

const BY_LANG: Record<AppLanguage, Record<string, Entry>> = { fr: FR, es: ES };

/** Fiil için kısa anlam + eş anlamlılar metni (gösterim için birleşik). Yoksa yer tutucu. */
export function getVerbMeaningAndSynonyms(verbKey: string, lang: AppLanguage): string {
  const key = verbKey.trim().toLowerCase();
  const entry = BY_LANG[lang]?.[key];
  if (!entry) return 'anlam; eş anlamlı 1; eş anlamlı 2...';
  return `${entry.meaning}; ${entry.synonyms}`;
}
