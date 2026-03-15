/**
 * Ezber Makinesi — kullanıcıdan gelen kelimeleri localStorage'da tutar.
 * Cümle Laboratuvarı vb. sayfalardan "Desteye Ekle" ile eklenen kelimeler.
 * İleride Firebase'e taşınabilir.
 */

const USER_DECK_KEY = 'user_deck';

export type UserDeckEntry = {
  word: string;
  translation: string;
  language: string;
};

function readDeck(): UserDeckEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(USER_DECK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is UserDeckEntry =>
        typeof x === 'object' &&
        x !== null &&
        'word' in x &&
        'translation' in x &&
        'language' in x &&
        typeof (x as UserDeckEntry).word === 'string' &&
        typeof (x as UserDeckEntry).translation === 'string' &&
        typeof (x as UserDeckEntry).language === 'string'
    );
  } catch {
    return [];
  }
}

function writeDeck(entries: UserDeckEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_DECK_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

/** localStorage'daki kullanıcı destesini döner */
export function getLocalDeck(): UserDeckEntry[] {
  return readDeck();
}

/** Dile göre filtrelenmiş kullanıcı destesi (Ezber Makinesi dil etiketleri: Fransızca, İspanyolca, İngilizce) */
export function getLocalDeckByLanguage(language: string): UserDeckEntry[] {
  return readDeck().filter((e) => e.language === language);
}

/** Kelimeyi kullanıcı destesine ekler; dil ile eşleşen sette Ezber Makinesi'nde görünür */
export function addWordToLocalDeck(word: string, translation: string, language: string): void {
  const trimmedWord = (word || '').trim();
  const trimmedTranslation = (translation || '').trim();
  const trimmedLang = (language || '').trim();
  if (!trimmedWord || !trimmedLang) return;
  const deck = readDeck();
  deck.push({
    word: trimmedWord,
    translation: trimmedTranslation || trimmedWord,
    language: trimmedLang,
  });
  writeDeck(deck);
}
