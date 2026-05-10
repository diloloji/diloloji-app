import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  signIn as signInApi,
  signUp as signUpApi,
  signInWithGoogle as signInWithGoogleApi,
  signOut as signOutApi,
  resetPasswordForEmail,
  mapAuthErrorToTr,
} from '../lib/auth';
import { setCachedAuthUserId } from '../lib/authSession';
import { syncLocalProgressToSupabase, syncSupabaseProgressToLocal } from '../lib/sync';
import { setStarredCloudOverride } from '../utils/starredVerbs';
import { fetchUserFavorites } from '../lib/userProgressDb';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        setCachedAuthUserId(session.user.id);
        setUser(session.user);
        void fetchUserFavorites(session.user.id).then(setStarredCloudOverride);
      } else {
        setCachedAuthUserId(null);
        setUser(null);
        setStarredCloudOverride(null);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      void (async () => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          await syncLocalProgressToSupabase(session.user.id);
        }
        if (session?.user) {
          setCachedAuthUserId(session.user.id);
          setUser(session.user);
          const fav = await fetchUserFavorites(session.user.id);
          setStarredCloudOverride(fav);
        } else {
          setCachedAuthUserId(null);
          setUser(null);
          setStarredCloudOverride(null);
        }
      })();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await signInApi(email, password);
      return { error: mapAuthErrorToTr(error) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Bir hata oluştu' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await signUpApi(email, password);
      return { error: mapAuthErrorToTr(error) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Bir hata oluştu' };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await signInWithGoogleApi();
      return { error: mapAuthErrorToTr(error) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Bir hata oluştu' };
    }
  }, []);

  const signOut = useCallback(async () => {
    const uid = user?.id;
    if (uid) {
      await syncSupabaseProgressToLocal(uid);
    }
    setStarredCloudOverride(null);
    setCachedAuthUserId(null);
    await signOutApi();
    setUser(null);
  }, [user?.id]);

  const resetPasswordCb = useCallback(async (email: string) => {
    try {
      const { error } = await resetPasswordForEmail(email);
      return { error: mapAuthErrorToTr(error) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Bir hata oluştu' };
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      resetPassword: resetPasswordCb,
    }),
    [user, loading, signIn, signUp, signOut, signInWithGoogle, resetPasswordCb]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
