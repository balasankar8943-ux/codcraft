begin;

create table if not exists public.student_progress (
  email text primary key,
  level text not null default 'beginner',
  solved_count integer not null default 0 check (solved_count >= 0),
  attempted_count integer not null default 0 check (attempted_count >= 0),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  score integer not null default 0,
  solved_questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_progress
  add column if not exists level text not null default 'beginner',
  add column if not exists solved_count integer not null default 0,
  add column if not exists attempted_count integer not null default 0,
  add column if not exists wrong_count integer not null default 0,
  add column if not exists score integer not null default 0,
  add column if not exists solved_questions jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.calculate_codcraft_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.solved_count := greatest(coalesce(new.solved_count, 0), 0);
  new.wrong_count := greatest(coalesce(new.wrong_count, 0), 0);
  new.attempted_count := new.solved_count + new.wrong_count;
  new.score := (new.solved_count * 20) - (new.wrong_count * 5);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists calculate_codcraft_progress
on public.student_progress;

create trigger calculate_codcraft_progress
before insert or update on public.student_progress
for each row
execute function public.calculate_codcraft_progress();

commit;
