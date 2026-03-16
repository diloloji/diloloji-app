/**
 * Görev Simülatörü — konuşma geçmişi localStorage.
 * Key: diloloji_conversations
 * Son 10 konuşma.
 */

import type { RoleplayMessage } from '../services/roleplayGroq';
import type { ConversationFeedback } from '../services/roleplayGroq';

export interface SavedConversation {
  scenarioId: string;
  messages: RoleplayMessage[];
  startedAt: string;
  completedAt?: string;
  feedback?: ConversationFeedback;
}

const STORAGE_KEY = 'diloloji_conversations';
const MAX_SAVED = 10;

function load(): SavedConversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list: SavedConversation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_SAVED)));
  } catch {
    /* ignore */
  }
}

/** Son kayıtlı konuşmaları getir */
export function getSavedConversations(): SavedConversation[] {
  return load();
}

/** Tamamlanmamış (completedAt yok) ve bu senaryoya ait son konuşma */
export function getIncompleteConversation(scenarioId: string): SavedConversation | null {
  const list = load();
  return list.find((c) => c.scenarioId === scenarioId && !c.completedAt) ?? null;
}

/** Konuşmayı kaydet veya güncelle. Aynı scenarioId + tamamlanmamış varsa güncelle. */
export function saveConversation(
  scenarioId: string,
  messages: RoleplayMessage[],
  opts?: { completedAt?: string; feedback?: ConversationFeedback }
): void {
  const list = load();
  const existingIdx = list.findIndex((c) => c.scenarioId === scenarioId && !c.completedAt);
  const now = new Date().toISOString();
  const entry: SavedConversation = {
    scenarioId,
    messages,
    startedAt: existingIdx >= 0 ? list[existingIdx].startedAt : now,
    completedAt: opts?.completedAt,
    feedback: opts?.feedback,
  };
  const next = existingIdx >= 0 ? list.filter((_, i) => i !== existingIdx) : list;
  next.push(entry);
  save(next);
}

/** Konuşmayı tamamlandı olarak işaretle (feedback ile) */
export function markConversationCompleted(
  scenarioId: string,
  messages: RoleplayMessage[],
  feedback?: ConversationFeedback
): void {
  saveConversation(scenarioId, messages, {
    completedAt: new Date().toISOString(),
    feedback,
  });
}

/** Tamamlanmış senaryo id'leri (yeşil checkmark göstermek için) */
export function getCompletedScenarioIds(): string[] {
  const list = load();
  const ids = new Set<string>();
  list.forEach((c) => {
    if (c.completedAt) ids.add(c.scenarioId);
  });
  return Array.from(ids);
}

const DYNAMIC_SCENARIOS_KEY = 'diloloji_dynamic_scenarios';

export interface StoredDynamicScenario {
  id: string;
  title: string;
  characterName: string;
  roleLabel: string;
  role: string;
  missionGoal: string;
  language: string;
  langCode: 'fr' | 'es' | 'en';
  icon: string;
  quickPhrases: string[];
  successCriteria: string[];
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  category: 'seyahat' | 'is' | 'sosyal' | 'alisveris';
  estimatedMinutes?: number;
  backgroundGradient: string;
}

export function getDynamicScenarios(): StoredDynamicScenario[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DYNAMIC_SCENARIOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDynamicScenarios(list: StoredDynamicScenario[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DYNAMIC_SCENARIOS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
