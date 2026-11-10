-- Третий релиз: слоты упражнений.
-- Выполни в Supabase SQL Editor после schema.sql и schema_v2.sql.

alter table public.workouts
  add column if not exists slot_id text;

-- Старая уникальность по названию упражнения больше не нужна:
-- теперь одна запись на слот, а упражнение внутри слота можно менять.
alter table public.workouts
  drop constraint if exists workouts_user_id_workout_date_day_exercise_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workouts_user_date_day_slot_key'
  ) then
    alter table public.workouts
      add constraint workouts_user_date_day_slot_key
      unique (user_id, workout_date, day, slot_id);
  end if;
end
$$;

create index if not exists workouts_user_date_slot_idx
  on public.workouts (user_id, workout_date, day, slot_id);
