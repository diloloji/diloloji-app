/**
 * Deste Mağazası — localStorage tabanlı SRS state yönetimi.
 * Kullanıcının kendi desteleri + topluluk destelerinin kopyaları burada.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Deck, Card } from '../types/deck';
import { defaultSRS, todayStr, COMMUNITY_DECKS } from '../types/deck';

const STORAGE_KEY = 'diloloji-srs-decks-v2';

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): Deck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Deck[];
  } catch {
    return [];
  }
}

function saveToStorage(decks: Deck[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch {
    // localStorage dolu olabilir
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useDeckStore() {
  const [userDecks, setUserDecks] = useState<Deck[]>(() => loadFromStorage());

  // localStorage ile senkronize et
  useEffect(() => {
    saveToStorage(userDecks);
  }, [userDecks]);

  // ── CRUD ────────────────────────────────────────────────────────────────

  const createDeck = useCallback((
    title: string,
    language: string,
    icon: string,
    description: string,
    pairs: { front: string; back: string; hint?: string }[],
  ): Deck => {
    const now = new Date().toISOString();
    const deck: Deck = {
      id: uid(),
      title,
      language,
      icon: icon || '📚',
      description,
      author: 'Ben',
      isPublic: false,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
      cards: pairs
        .filter((p) => p.front.trim() && p.back.trim())
        .map((p) => ({
          id: uid(),
          front: p.front.trim(),
          back: p.back.trim(),
          hint: p.hint?.trim(),
          srs: defaultSRS(),
        } satisfies Card)),
    };
    setUserDecks((prev) => [deck, ...prev]);
    return deck;
  }, []);

  const updateDeck = useCallback((
    id: string,
    updates: Partial<Pick<Deck, 'title' | 'language' | 'icon' | 'description'>> & {
      pairs?: { front: string; back: string; hint?: string }[];
    },
  ): void => {
    setUserDecks((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const now = new Date().toISOString();
        const newCards: Card[] = updates.pairs
          ? updates.pairs
              .filter((p) => p.front.trim() && p.back.trim())
              .map((p) => {
                // Mevcut kartı bul (SRS verisini koru)
                const existing = d.cards.find(
                  (c) => c.front === p.front.trim() && c.back === p.back.trim(),
                );
                return existing ?? {
                  id: uid(),
                  front: p.front.trim(),
                  back: p.back.trim(),
                  hint: p.hint?.trim(),
                  srs: defaultSRS(),
                };
              })
          : d.cards;
        return { ...d, ...updates, cards: newCards, updatedAt: now };
      }),
    );
  }, []);

  const deleteDeck = useCallback((id: string): void => {
    setUserDecks((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const duplicateDeck = useCallback((source: Deck): Deck => {
    const now = new Date().toISOString();
    const copy: Deck = {
      ...source,
      id: uid(),
      title: `${source.title} (kopya)`,
      author: 'Ben',
      isPublic: false,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
      // Kopyada SRS verisi sıfırlanır
      cards: source.cards.map((c) => ({
        ...c,
        id: uid(),
        srs: defaultSRS(),
      })),
    };
    setUserDecks((prev) => [copy, ...prev]);
    return copy;
  }, []);

  /** Bir oturumdaki kart güncellemelerini kaydet */
  const updateCards = useCallback((deckId: string, updatedCards: Card[]): void => {
    setUserDecks((prev) =>
      prev.map((d) => {
        if (d.id !== deckId) return d;
        const cardMap = new Map(updatedCards.map((c) => [c.id, c]));
        return {
          ...d,
          updatedAt: new Date().toISOString(),
          cards: d.cards.map((c) => cardMap.get(c.id) ?? c),
        };
      }),
    );
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────

  const getDueCount = useCallback((deck: Deck): number => {
    const today = todayStr();
    return deck.cards.filter((c) => c.srs.nextReviewDate <= today).length;
  }, []);

  const getNewCount = useCallback((deck: Deck): number => {
    return deck.cards.filter((c) => c.srs.repetitions === 0).length;
  }, []);

  const getMasteredCount = useCallback((deck: Deck): number => {
    return deck.cards.filter((c) => c.srs.interval >= 21).length;
  }, []);

  return {
    userDecks,
    communityDecks: COMMUNITY_DECKS,
    allDecks: [...userDecks, ...COMMUNITY_DECKS],
    createDeck,
    updateDeck,
    deleteDeck,
    duplicateDeck,
    updateCards,
    getDueCount,
    getNewCount,
    getMasteredCount,
  };
}

export type DeckStore = ReturnType<typeof useDeckStore>;
