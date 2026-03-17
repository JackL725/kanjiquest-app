-- ═══════════════════════════════════════════════════════════════════════
-- KanjiQuest Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Profiles ────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific data.
-- Auto-created on signup via trigger.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ─── Auto-create profile on signup ───────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─── SRS Progress ────────────────────────────────────────────────────
-- Stores FSRS card state for each user × deck × card.
-- Mirrors the localStorage format so sync is a direct merge.
create table if not exists public.srs_progress (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  deck_id        text not null,
  card_id        text not null,
  -- FSRS card state
  due            timestamptz not null default now(),
  stability      double precision not null default 0,
  difficulty     double precision not null default 0,
  elapsed_days   integer not null default 0,
  scheduled_days integer not null default 0,
  reps           integer not null default 0,
  lapses         integer not null default 0,
  learning_steps integer not null default 0,
  state          integer not null default 0,  -- 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review    timestamptz,
  -- KQ metadata
  first_studied  timestamptz,
  -- Timestamps
  created_at     timestamptz default now() not null,
  updated_at     timestamptz default now() not null,

  unique (user_id, deck_id, card_id)
);

create index if not exists idx_srs_progress_user
  on public.srs_progress (user_id);

create index if not exists idx_srs_progress_user_deck
  on public.srs_progress (user_id, deck_id);

create index if not exists idx_srs_progress_due
  on public.srs_progress (user_id, due);

alter table public.srs_progress enable row level security;

create policy "Users can read own progress"
  on public.srs_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.srs_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.srs_progress for update
  using (auth.uid() = user_id);

create policy "Users can delete own progress"
  on public.srs_progress for delete
  using (auth.uid() = user_id);


-- ─── Owned Decks ─────────────────────────────────────────────────────
-- Tracks which paid decks a user has purchased.
-- Free decks (radicals, primer) don't need entries here.
create table if not exists public.owned_decks (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  deck_id     text not null,
  purchased_at timestamptz default now() not null,
  -- RevenueCat transaction ID for receipt validation
  transaction_id text,
  price_paid     numeric(5,2),

  unique (user_id, deck_id)
);

create index if not exists idx_owned_decks_user
  on public.owned_decks (user_id);

alter table public.owned_decks enable row level security;

create policy "Users can read own decks"
  on public.owned_decks for select
  using (auth.uid() = user_id);

create policy "Users can insert own decks"
  on public.owned_decks for insert
  with check (auth.uid() = user_id);


-- ─── Achievements ────────────────────────────────────────────────────
-- Tracks earned achievements per user.
create table if not exists public.achievements (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  earned_at    timestamptz default now() not null,
  -- Optional progress data (e.g. "studied 7/30 days")
  progress     integer default 0,
  target       integer default 0,

  unique (user_id, achievement_id)
);

create index if not exists idx_achievements_user
  on public.achievements (user_id);

alter table public.achievements enable row level security;

create policy "Users can read own achievements"
  on public.achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on public.achievements for insert
  with check (auth.uid() = user_id);

create policy "Users can update own achievements"
  on public.achievements for update
  using (auth.uid() = user_id);


-- ─── Study Dates (for streak tracking) ───────────────────────────────
create table if not exists public.study_dates (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  date     date not null,

  unique (user_id, date)
);

create index if not exists idx_study_dates_user
  on public.study_dates (user_id, date desc);

alter table public.study_dates enable row level security;

create policy "Users can read own study dates"
  on public.study_dates for select
  using (auth.uid() = user_id);

create policy "Users can insert own study dates"
  on public.study_dates for insert
  with check (auth.uid() = user_id);


-- ─── Updated_at trigger ──────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_srs_progress_updated_at
  before update on public.srs_progress
  for each row execute function public.set_updated_at();
