/**
 * Onboarding tercihleri — localStorage ile kalıcı, kişiselleştirme için kullanılır.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'diloloji_onboarding';

export type OnboardingLanguage = 'Fransızca' | 'İspanyolca' | 'İngilizce';
export type OnboardingLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type OnboardingDailyGoal = 5 | 10 | 20;
export type OnboardingPurpose = 'Seyahat' | 'İş' | 'Sınav' | 'Genel';

export interface OnboardingData {
  language: OnboardingLanguage;
  level: OnboardingLevel;
  dailyGoalMinutes: OnboardingDailyGoal;
  purpose: OnboardingPurpose;
  completedAt: number;
}

const DEFAULT_DATA: OnboardingData = {
  language: 'Fransızca',
  level: 'A1',
  dailyGoalMinutes: 10,
  purpose: 'Genel',
  completedAt: 0,
};

function loadFromStorage(): OnboardingData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || !('completedAt' in parsed) || !(parsed as OnboardingData).completedAt)
      return null;
    return parsed as OnboardingData;
  } catch {
    return null;
  }
}

function saveToStorage(data: OnboardingData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

type OnboardingContextValue = {
  data: OnboardingData | null;
  isCompleted: boolean;
  completeOnboarding: (data: Omit<OnboardingData, 'completedAt'>) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setData(loadFromStorage());
    setMounted(true);
  }, []);

  const completeOnboarding = useCallback((payload: Omit<OnboardingData, 'completedAt'>) => {
    const full: OnboardingData = { ...payload, completedAt: Date.now() };
    setData(full);
    saveToStorage(full);
  }, []);

  const skipOnboarding = useCallback(() => {
    const full: OnboardingData = { ...DEFAULT_DATA, completedAt: Date.now() };
    setData(full);
    saveToStorage(full);
  }, []);

  const resetOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    setData(null);
  }, []);

  const value: OnboardingContextValue = {
    data: mounted ? data : null,
    isCompleted: mounted && data !== null && data.completedAt > 0,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
