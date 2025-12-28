-- Supabase Schema for Pledge App
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- 
-- IMPORTANT: Run this AFTER creating your Supabase project
-- If you've already run an older version, run the migration at the bottom first

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    name text not null,
    email text not null,
    avatar_initials text not null default 'U',
    group_id uuid,  -- Direct reference to group (simpler than junction table)
    score integer not null default 0,
    monthly_score integer not null default 0,
    streak integer not null default 0,
    rank integer not null default 0,
    rank_change text not null default 'same',
    honesty_score integer not null default 100,
    is_daily_hero boolean not null default false,
    seasonal_label text default 'Consistent Starter',
    badges jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- GROUPS TABLE
-- ============================================
create table if not exists public.groups (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    invite_code text not null unique,
    creator_id uuid,
    admin_ids uuid[] default array[]::uuid[],
    daily_hero_id uuid,
    last_hero_selection_date text,
    weekly_comeback_hero_id uuid,
    last_comeback_selection_date text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add foreign key after both tables exist
alter table public.profiles 
    add constraint profiles_group_id_fkey 
    foreign key (group_id) references public.groups(id) on delete set null;

-- ============================================
-- RESOLUTIONS TABLE
-- ============================================
create table if not exists public.resolutions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    category text,
    type text not null check (type in ('BINARY', 'STREAK', 'FREQUENCY')),
    difficulty integer not null check (difficulty >= 1 and difficulty <= 5),
    is_private boolean not null default false,
    sub_goals jsonb default '[]'::jsonb,
    peer_difficulty_votes jsonb default '{}'::jsonb,
    effective_difficulty numeric default 0,
    credibility jsonb default '{}'::jsonb,
    target_count integer,
    history jsonb default '{}'::jsonb,
    current_count integer default 0,
    current_streak integer default 0,
    today_status text default 'UNCHECKED' check (today_status in ('UNCHECKED', 'COMPLETED', 'MISSED', 'ARCHIVED')),
    is_broken boolean default false,
    archived_at timestamp with time zone,
    archived_reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- BETS TABLE
-- ============================================
create table if not exists public.bets (
    id uuid default gen_random_uuid() primary key,
    resolution_id uuid references public.resolutions(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    start_date text not null,
    end_date text not null,
    stake text not null,
    status text not null default 'ACTIVE' check (status in ('ACTIVE', 'WON', 'LOST')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- FEED EVENTS TABLE
-- ============================================
create table if not exists public.feed_events (
    id uuid default gen_random_uuid() primary key,
    type text not null check (type in ('check-in', 'miss', 'streak', 'bet-won', 'bet-lost', 'system', 'hero', 'comeback')),
    user_id uuid references public.profiles(id) on delete set null,
    group_id uuid references public.groups(id) on delete cascade,
    message text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- CONFESSIONS TABLE
-- ============================================
create table if not exists public.confessions (
    id uuid default gen_random_uuid() primary key,
    group_id uuid references public.groups(id) on delete cascade not null,
    text text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.resolutions enable row level security;
alter table public.bets enable row level security;
alter table public.feed_events enable row level security;
alter table public.confessions enable row level security;

-- Drop existing policies if they exist (for re-running)
drop policy if exists "Users can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Anyone can view groups" on public.groups;
drop policy if exists "Authenticated users can create groups" on public.groups;
drop policy if exists "Group admins can update groups" on public.groups;
drop policy if exists "Users can view public resolutions" on public.resolutions;
drop policy if exists "Users can create own resolutions" on public.resolutions;
drop policy if exists "Users can update own resolutions" on public.resolutions;
drop policy if exists "Users can delete own resolutions" on public.resolutions;
drop policy if exists "Anyone can view bets" on public.bets;
drop policy if exists "Users can create bets" on public.bets;
drop policy if exists "Users can update own bets" on public.bets;
drop policy if exists "Group members can view feed" on public.feed_events;
drop policy if exists "Users can create feed events" on public.feed_events;
drop policy if exists "Group members can view confessions" on public.confessions;
drop policy if exists "Authenticated users can create confessions" on public.confessions;

-- PROFILES policies
create policy "Users can view all profiles" on public.profiles
    for select using (true);

create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
    for insert with check (auth.uid() = id);

-- GROUPS policies
create policy "Anyone can view groups" on public.groups
    for select using (true);

create policy "Authenticated users can create groups" on public.groups
    for insert with check (auth.uid() is not null);

create policy "Authenticated users can update groups" on public.groups
    for update using (auth.uid() is not null);

-- RESOLUTIONS policies
create policy "Users can view public resolutions" on public.resolutions
    for select using (is_private = false or auth.uid() = user_id);

create policy "Users can create own resolutions" on public.resolutions
    for insert with check (auth.uid() = user_id);

create policy "Users can update own resolutions" on public.resolutions
    for update using (auth.uid() = user_id);

create policy "Users can delete own resolutions" on public.resolutions
    for delete using (auth.uid() = user_id);

-- BETS policies
create policy "Anyone can view bets" on public.bets
    for select using (true);

create policy "Users can create bets" on public.bets
    for insert with check (auth.uid() = user_id);

create policy "Users can update own bets" on public.bets
    for update using (auth.uid() = user_id);

-- FEED_EVENTS policies
create policy "Group members can view feed" on public.feed_events
    for select using (true);

create policy "Users can create feed events" on public.feed_events
    for insert with check (auth.uid() = user_id);

-- CONFESSIONS policies
create policy "Group members can view confessions" on public.confessions
    for select using (true);

create policy "Authenticated users can create confessions" on public.confessions
    for insert with check (auth.uid() is not null);

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, name, email, avatar_initials)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        upper(left(coalesce(new.raw_user_meta_data->>'name', new.email), 2))
    );
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- ============================================
-- INDEXES for performance
-- ============================================
create index if not exists idx_profiles_group on public.profiles(group_id);
create index if not exists idx_resolutions_user on public.resolutions(user_id);
create index if not exists idx_feed_events_group on public.feed_events(group_id);
create index if not exists idx_groups_invite_code on public.groups(invite_code);

-- ============================================
-- MIGRATION: If you have existing data
-- ============================================
-- Run this if you already had the old schema:
-- 
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS group_id uuid;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_group_id_fkey 
--     FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;
