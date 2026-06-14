-- ============================================================
-- CodCraft KTU — Database Migration v2
-- Run this in the Supabase SQL Editor
-- ============================================================

begin;

-- 1. Extend student_profiles with gamification columns
alter table public.student_profiles
  add column if not exists xp integer not null default 0,
  add column if not exists badges text[] not null default '{}'::text[],
  add column if not exists diagnostic_completed boolean not null default false;

-- 2. Create student_submissions table for rolling accuracy tracking
create table if not exists public.student_submissions (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.student_profiles(id) on delete cascade not null,
  question_id integer not null,
  tier text not null check (tier in ('beginner', 'mid', 'pro')),
  is_correct boolean not null,
  submitted_at timestamptz not null default now()
);

-- Index for fast rolling history queries
create index if not exists idx_student_submissions_lookup 
  on public.student_submissions(student_id, tier, submitted_at desc);

-- Enable RLS on student_submissions
alter table public.student_submissions enable row level security;

-- Drop policy if exists so script is re-runnable
drop policy if exists "students can insert their submissions" on public.student_submissions;
drop policy if exists "students can view their submissions" on public.student_submissions;

-- Create policies for student_submissions
create policy "students can insert their submissions"
  on public.student_submissions for insert
  to authenticated
  with check (auth.uid() = student_id);

create policy "students can view their submissions"
  on public.student_submissions for select
  to authenticated
  using (auth.uid() = student_id);

-- 3. Adjust handle_new_codcraft_user trigger function to include default gamification stats
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
    level,
    xp,
    badges,
    diagnostic_completed
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
    coalesce(new.raw_user_meta_data ->> 'level', 'beginner'),
    0,
    '{}'::text[],
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    college = excluded.college,
    updated_at = now();

  -- Auto-create progress row too
  insert into public.student_progress (
    email,
    level,
    solved_count,
    attempted_count,
    wrong_count,
    score,
    solved_questions
  )
  values (
    new.email,
    coalesce(new.raw_user_meta_data ->> 'level', 'beginner'),
    0,
    0,
    0,
    0,
    '[]'::jsonb
  )
  on conflict (email) do nothing;

  return new;
end;
$$;

commit;
