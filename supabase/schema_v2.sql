-- Второй релиз: замеры тела, тесты ГТО, пробежки.
-- Выполни этот файл в Supabase SQL Editor после schema.sql.

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric,
  waist_cm numeric,
  sleep_hours numeric,
  mood int,
  smoking int,
  notes text,
  updated_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create table if not exists public.gto_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tested_on date not null,
  pullups int,
  pushups int,
  situps int,
  forward_bend_cm numeric,
  sprint_100m_s numeric,
  run_3km_s int,
  notes text,
  updated_at timestamptz not null default now(),
  unique (user_id, tested_on)
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_date date not null,
  distance_km numeric,
  duration_min numeric,
  avg_hr int,
  surface text,
  notes text,
  updated_at timestamptz not null default now(),
  unique (user_id, run_date, distance_km, duration_min)
);

create index if not exists body_metrics_user_date_idx
  on public.body_metrics (user_id, measured_on);

create index if not exists gto_tests_user_date_idx
  on public.gto_tests (user_id, tested_on);

create index if not exists runs_user_date_idx
  on public.runs (user_id, run_date);

alter table public.body_metrics enable row level security;
alter table public.gto_tests enable row level security;
alter table public.runs enable row level security;

drop policy if exists "own body metrics" on public.body_metrics;
create policy "own body metrics"
  on public.body_metrics
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own gto tests" on public.gto_tests;
create policy "own gto tests"
  on public.gto_tests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own runs" on public.runs;
create policy "own runs"
  on public.runs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists body_metrics_updated_at on public.body_metrics;
create trigger body_metrics_updated_at
  before update on public.body_metrics
  for each row
  execute function public.set_updated_at();

drop trigger if exists gto_tests_updated_at on public.gto_tests;
create trigger gto_tests_updated_at
  before update on public.gto_tests
  for each row
  execute function public.set_updated_at();

drop trigger if exists runs_updated_at on public.runs;
create trigger runs_updated_at
  before update on public.runs
  for each row
  execute function public.set_updated_at();
