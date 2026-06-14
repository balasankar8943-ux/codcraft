begin;

-- Student profile created from Supabase Auth.
create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  college text,
  level text not null default 'beginner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Progress used by the CodCraft score and certificate flow.
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

-- Optional support table for future student questions.
create table if not exists public.student_questions (
  id bigint generated always as identity primary key,
  email text not null,
  question text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- Add columns when this script is run over an older CodCraft schema.
alter table public.student_profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.student_progress
  add column if not exists attempted_count integer not null default 0,
  add column if not exists wrong_count integer not null default 0,
  add column if not exists score integer not null default 0;

-- Automatically maintain updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_student_profiles_updated_at on public.student_profiles;
create trigger set_student_profiles_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_student_progress_updated_at on public.student_progress;
create trigger set_student_progress_updated_at
before update on public.student_progress
for each row execute function public.set_updated_at();

-- Create or refresh a public profile whenever a Supabase Auth user signs up.
create or replace function public.handle_new_codcraft_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_profiles (
    id,
    email,
    full_name,
    college,
    level
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'college',
      'Kerala Engineering Student'
    ),
    coalesce(new.raw_user_meta_data ->> 'level', 'beginner')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    college = excluded.college,
    level = excluded.level,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_codcraft_auth_user_created on auth.users;
create trigger on_codcraft_auth_user_created
after insert or update of raw_user_meta_data, email on auth.users
for each row execute function public.handle_new_codcraft_user();

-- Enable Row Level Security for every browser-accessible table.
alter table public.student_profiles enable row level security;
alter table public.student_progress enable row level security;
alter table public.student_questions enable row level security;

-- Policies are dropped first so this script can safely be run again.
drop policy if exists "students can read their profile" on public.student_profiles;
drop policy if exists "students can insert their profile" on public.student_profiles;
drop policy if exists "students can update their profile" on public.student_profiles;

create policy "students can read their profile"
on public.student_profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "students can insert their profile"
on public.student_profiles
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "students can update their profile"
on public.student_profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "students can read their progress" on public.student_progress;
drop policy if exists "students can upsert their progress" on public.student_progress;
drop policy if exists "students can update their progress" on public.student_progress;

create policy "students can read their progress"
on public.student_progress
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.jwt() ->> 'email') = email
);

create policy "students can upsert their progress"
on public.student_progress
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.jwt() ->> 'email') = email
);

create policy "students can update their progress"
on public.student_progress
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.jwt() ->> 'email') = email
)
with check (
  (select auth.uid()) is not null
  and (select auth.jwt() ->> 'email') = email
);

drop policy if exists "students can add questions" on public.student_questions;
drop policy if exists "students can read their questions" on public.student_questions;

create policy "students can add questions"
on public.student_questions
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.jwt() ->> 'email') = email
);

create policy "students can read their questions"
on public.student_questions
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.jwt() ->> 'email') = email
);

-- Guests receive no database-table access.
revoke all on table public.student_profiles from anon;
revoke all on table public.student_progress from anon;
revoke all on table public.student_questions from anon;

grant select, insert, update on table public.student_profiles to authenticated;
grant select, insert, update on table public.student_progress to authenticated;
grant select, insert on table public.student_questions to authenticated;
grant usage, select on sequence public.student_questions_id_seq to authenticated;

-- Login-only leaderboard RPC. It exposes no email addresses.
drop function if exists public.get_codcraft_leaderboard(integer);

create function public.get_codcraft_leaderboard(result_limit integer default 100)
returns table (
  student_name text,
  college text,
  solved_count integer,
  attempted_count integer,
  wrong_count integer,
  score integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(profile.full_name, 'CodCraft Student') as student_name,
    coalesce(profile.college, 'Kerala Engineering Student') as college,
    progress.solved_count,
    progress.attempted_count,
    progress.wrong_count,
    progress.score
  from public.student_progress as progress
  join public.student_profiles as profile
    on profile.email = progress.email
  where (select auth.uid()) is not null
  order by score desc, profile.full_name asc
  limit greatest(1, least(result_limit, 100));
$$;

revoke all on function public.get_codcraft_leaderboard(integer) from public;
revoke all on function public.get_codcraft_leaderboard(integer) from anon;
grant execute on function public.get_codcraft_leaderboard(integer) to authenticated;

commit;
