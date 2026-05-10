import type { AuthError, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export type AuthResult = { user: User | null; error: AuthError | null };

function ensureClient() {
  if (!supabase) throw new Error('Supabase yapılandırılmadı (.env VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  return supabase;
}

export function mapAuthErrorToTr(err: AuthError | null): string | null {
  if (!err) return null;
  const code = err.code ?? '';
  const msg = (err.message || '').toLowerCase();

  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already been registered')) {
    return 'Bu email zaten kayıtlı';
  }
  if (
    code === 'invalid_credentials' ||
    msg.includes('invalid login credentials') ||
    msg.includes('invalid_credentials')
  ) {
    return 'Email veya şifre hatalı';
  }
  if (msg.includes('password') && (msg.includes('6') || msg.includes('least'))) {
    return 'Şifre en az 6 karakter olmalı';
  }
  if (code === 'weak_password') {
    return 'Şifre en az 6 karakter olmalı';
  }
  return err.message || 'Bir hata oluştu';
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const client = ensureClient();
  const { data, error } = await client.auth.signUp({ email: email.trim(), password });
  return { user: data.user, error };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const client = ensureClient();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  return { user: data.user, error };
}

export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const client = ensureClient();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return { error };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function resetPasswordForEmail(email: string): Promise<{ error: AuthError | null }> {
  const client = ensureClient();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  return { error };
}

export { isSupabaseConfigured };
