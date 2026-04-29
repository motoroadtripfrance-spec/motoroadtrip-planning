-- Motoroadtrip Planning Pro - Supabase schema
-- À exécuter dans Supabase > SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('admin', 'guide')),
  guide_id uuid references public.guides(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('restaurant', 'gite')),
  created_at timestamptz not null default now(),
  unique(name, kind)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete restrict,
  event_type text not null,
  start_date date not null,
  end_date date not null,
  gite_place_id uuid references public.places(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.event_meals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  meal_date date not null,
  lunch_place_id uuid references public.places(id) on delete set null,
  dinner_place_id uuid references public.places(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(event_id, meal_date)
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.guides enable row level security;
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.events enable row level security;
alter table public.event_meals enable row level security;
alter table public.participants enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_guide_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select guide_id from public.profiles where id = auth.uid()
$$;

-- GUIDES
drop policy if exists "guides_select_authenticated" on public.guides;
create policy "guides_select_authenticated"
on public.guides for select
to authenticated
using (true);

drop policy if exists "guides_admin_all" on public.guides;
create policy "guides_admin_all"
on public.guides for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- PROFILES
drop policy if exists "profiles_select_admin_or_self" on public.profiles;
create policy "profiles_select_admin_or_self"
on public.profiles for select
to authenticated
using (public.current_profile_role() = 'admin' or id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- PLACES
drop policy if exists "places_select_authenticated" on public.places;
create policy "places_select_authenticated"
on public.places for select
to authenticated
using (true);

drop policy if exists "places_admin_all" on public.places;
create policy "places_admin_all"
on public.places for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- EVENTS
drop policy if exists "events_select_admin_or_own_guide" on public.events;
create policy "events_select_admin_or_own_guide"
on public.events for select
to authenticated
using (
  public.current_profile_role() = 'admin'
  or guide_id = public.current_profile_guide_id()
);

drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all"
on public.events for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- MEALS
drop policy if exists "meals_select_admin_or_own_guide" on public.event_meals;
create policy "meals_select_admin_or_own_guide"
on public.event_meals for select
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_meals.event_id
    and (
      public.current_profile_role() = 'admin'
      or e.guide_id = public.current_profile_guide_id()
    )
  )
);

drop policy if exists "meals_admin_all" on public.event_meals;
create policy "meals_admin_all"
on public.event_meals for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- PARTICIPANTS
drop policy if exists "participants_select_admin_or_own_guide" on public.participants;
create policy "participants_select_admin_or_own_guide"
on public.participants for select
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = participants.event_id
    and (
      public.current_profile_role() = 'admin'
      or e.guide_id = public.current_profile_guide_id()
    )
  )
);

drop policy if exists "participants_admin_all" on public.participants;
create policy "participants_admin_all"
on public.participants for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- Données de départ
insert into public.guides (name)
values ('Raphaël'), ('Arnaud'), ('Benjamin')
on conflict (name) do nothing;

insert into public.places (name, kind)
values
  ('Auberge locale', 'restaurant'),
  ('Restaurant du village', 'restaurant'),
  ('Repas au gîte', 'restaurant'),
  ('Gîte principal', 'gite'),
  ('Gîte secondaire', 'gite'),
  ('Chambres partagées', 'gite')
on conflict (name, kind) do nothing;
