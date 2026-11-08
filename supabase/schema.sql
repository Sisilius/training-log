-- Схема для Supabase SQL Editor.
-- Таблица хранит по одной строке на упражнение за дату.

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  day text not null,
  exercise text not null,
  plan text,
  set1 text,
  set2 text,
  set3 text,
  rpe text,
  pain text,
  notes text,
  updated_at timestamptz not null default now(),
  unique (user_id, workout_date, day, exercise)
);

create index if not exists workouts_user_date_idx
  on public.workouts (user_id, workout_date);

alter table public.workouts enable row level security;

drop policy if exists "own workouts" on public.workouts;
create policy "own workouts"
  on public.workouts
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

drop trigger if exists workouts_updated_at on public.workouts;
create trigger workouts_updated_at
  before update on public.workouts
  for each row
  execute function public.set_updated_at();
