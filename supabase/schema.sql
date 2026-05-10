-- Conjume / Diloloji — Supabase şeması (SQL Editor’da çalıştırın).
-- Google OAuth: Dashboard → Authentication → Providers → Google; redirect:
--   https://<PROJECT_REF>.supabase.co/auth/v1/callback

create extension if not exists "pgcrypto";

-- Toplam XP, seri, günlük XP özeti (ısı haritası ile uyumlu json)
create table if not exists public.user_xp (
  id uuid primary key references auth.users (id) on delete cascade,
  total_xp integer not null default 0,
  streak integer not null default 0,
  last_active_date text,
  best_streak integer not null default 0,
  xp_activity jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Fiil mastery hücreleri
create table if not exists public.verb_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  lang text not null,
  verb text not null,
  tense text not null,
  person text not null,
  correct_streak integer not null default 0,
  total_correct integer not null default 0,
  total_attempts integer not null default 0,
  last_seen text,
  next_review text,
  mastery_level integer not null default 0,
  interval integer not null default 1,
  practice_days jsonb not null default '[]'::jsonb,
  first_practice_day text,
  updated_at timestamptz default now(),
  primary key (user_id, lang, verb, tense, person)
);

create index if not exists verb_mastery_user_idx on public.verb_mastery (user_id);

-- Favori fiiller
create table if not exists public.user_favorites (
  user_id uuid primary key references auth.users (id) on delete cascade,
  verbs jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- Günlük aktivite (profil ısı haritası / raporlama)
create table if not exists public.activity_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  xp_earned integer not null default 0,
  correct_count integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, log_date)
);

alter table public.user_xp enable row level security;
alter table public.verb_mastery enable row level security;
alter table public.user_favorites enable row level security;
alter table public.activity_log enable row level security;

create policy "user_xp_own" on public.user_xp for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "verb_mastery_own" on public.verb_mastery for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_favorites_own" on public.user_favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activity_log_own" on public.activity_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
