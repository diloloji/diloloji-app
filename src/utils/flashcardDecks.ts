/**
 * Ezber Makinesi: Kelime desteleri ve kartları localStorage'da tutar.
 * Format: { id, title, cards: [{ id, front, back, interval, easeFactor, nextReviewDate }] }
 */

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  /** Örnek cümle (opsiyonel); arka yüzde italik gösterilir */
  example?: string;
  /** Telaffuz ses kaydı (data URL); opsiyonel */
  audioDataUrl?: string;
  /** SRS: kaç kez başarıyla tekrarlandı (0 = Again’den sonra sıfır) */
  repetition: number;
  /** SRS: tekrar aralığı (gün) */
  interval: number;
  /** SRS: kolaylık çarpanı (min 1.3) */
  easeFactor: number;
  /** SRS: bir sonraki tekrar tarihi (YYYY-MM-DD) */
  nextReviewDate: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  cards: Flashcard[];
  /** Dil kodu (örn. FR, ES, EN) — liste ekranında badge için */
  language?: string;
}

const STORAGE_KEY = 'conjume-flashcard-decks';

function storageGet(): FlashcardDeck[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is FlashcardDeck =>
        typeof x === 'object' &&
        x !== null &&
        'id' in x &&
        'title' in x &&
        Array.isArray((x as FlashcardDeck).cards)
    );
  } catch {
    return [];
  }
}

function storageSet(decks: FlashcardDeck[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch {
    // ignore
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultCard(
  front: string,
  back: string,
  example?: string,
  audioDataUrl?: string
): Flashcard {
  return {
    id: generateId(),
    front: front.trim(),
    back: back.trim(),
    example: example?.trim() || undefined,
    audioDataUrl: audioDataUrl || undefined,
    repetition: 0,
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    nextReviewDate: todayString(),
  };
}

/** Eski kayıtlarda repetition vb. eksikse varsayılan doldurur */
function normalizeCard(c: Partial<Flashcard> & { id: string; front: string; back: string }): Flashcard {
  return {
    id: c.id,
    front: c.front,
    back: c.back,
    example: c.example,
    audioDataUrl: c.audioDataUrl,
    repetition: c.repetition ?? 0,
    interval: c.interval ?? 0,
    easeFactor: Math.max(MIN_EASE_FACTOR, c.easeFactor ?? DEFAULT_EASE_FACTOR),
    nextReviewDate: c.nextReviewDate ?? todayString(),
  };
}

/** Tüm desteleri döner (kartlar normalize edilir). */
export function getFlashcardDecks(): FlashcardDeck[] {
  const raw = storageGet();
  return raw.map((deck) => ({
    ...deck,
    cards: deck.cards.map((c) => normalizeCard(c as Flashcard)),
  }));
}

/** Tek bir desteyi id ile getirir (kartlar normalize). */
export function getFlashcardDeckById(id: string): FlashcardDeck | null {
  return getFlashcardDecks().find((d) => d.id === id) ?? null;
}

/** Yeni deste oluşturur. */
export function createDeck(
  title: string,
  cards: { front: string; back: string; example?: string; audioDataUrl?: string }[]
): FlashcardDeck {
  const deck: FlashcardDeck = {
    id: generateId(),
    title: title.trim() || 'İsimsiz Set',
    cards: cards.map((c) => defaultCard(c.front, c.back, c.example, c.audioDataUrl)),
  };
  const decks = storageGet();
  decks.push(deck);
  storageSet(decks);
  return deck;
}

/** Deste günceller (başlık ve/veya kartlar). */
export function updateDeck(
  id: string,
  updates: { title?: string; cards?: { front: string; back: string; example?: string; audioDataUrl?: string }[] }
): FlashcardDeck | null {
  const decks = storageGet();
  const index = decks.findIndex((d) => d.id === id);
  if (index === -1) return null;
  if (updates.title !== undefined) decks[index].title = updates.title.trim() || 'İsimsiz Set';
  if (updates.cards !== undefined) {
    decks[index].cards = updates.cards.map((c) => defaultCard(c.front, c.back, c.example, c.audioDataUrl));
  }
  storageSet(decks);
  return decks[index];
}

/** Destenin kart listesini tamamen değiştirir (SRS alanları korunur). */
export function replaceDeckCards(deckId: string, cards: Flashcard[]): void {
  const decks = storageGet();
  const index = decks.findIndex((d) => d.id === deckId);
  if (index === -1) return;
  decks[index].cards = cards.map((c) => normalizeCard(c as Flashcard));
  storageSet(decks);
}

/** Desteyi siler. */
export function deleteDeck(id: string): boolean {
  const decks = storageGet().filter((d) => d.id !== id);
  if (decks.length === storageGet().length) return false;
  storageSet(decks);
  return true;
}

/** Bugünün tarihi YYYY-MM-DD */
export function getTodayString(): string {
  return todayString();
}

/** Sadece bugün veya geçmişte tekrarlanacak kartları döner */
export function getDueCards(cards: Flashcard[]): Flashcard[] {
  const today = todayString();
  return cards.filter((c) => (c.nextReviewDate || today) <= today);
}

/** Sette bugün çalışılacak kart sayısı */
export function getDueCount(deck: FlashcardDeck): number {
  return getDueCards(deck.cards).length;
}

/** Tek bir kartın SRS alanlarını günceller; localStorage ile senkron */
export function updateCardSRS(
  deckId: string,
  cardId: string,
  updates: { repetition?: number; interval?: number; easeFactor?: number; nextReviewDate?: string }
): void {
  const decks = storageGet();
  const deckIndex = decks.findIndex((d) => d.id === deckId);
  if (deckIndex === -1) return;
  const cardIndex = decks[deckIndex].cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return;
  const card = decks[deckIndex].cards[cardIndex];
  const c = card as unknown as Record<string, unknown>;
  if (updates.repetition !== undefined) c.repetition = updates.repetition;
  if (updates.interval !== undefined) c.interval = updates.interval;
  if (updates.easeFactor !== undefined) c.easeFactor = Math.max(MIN_EASE_FACTOR, updates.easeFactor);
  if (updates.nextReviewDate !== undefined) c.nextReviewDate = updates.nextReviewDate;
  storageSet(decks);
}

/** Metni kelime-anlam çiftlerine ayırır. Ayırıcı: virgül, tire veya tab (satır başına bir çift). */
export function parseBulkImport(text: string): { front: string; back: string }[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const result: { front: string; back: string }[] = [];
  for (const line of lines) {
    const match = line.match(/^(.+?)[\t,\-–—]\s*(.+)$/);
    if (match) {
      const front = match[1].trim();
      const back = match[2].trim();
      if (front && back) result.push({ front, back });
    }
  }
  return result;
}
