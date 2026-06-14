begin;

create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  college text,
  level text not null default 'beginner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles
  add column if not exists full_name text,
  add column if not exists college text,
  add column if not exists level text not null default 'beginner',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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

drop trigger if exists set_student_profiles_updated_at
on public.student_profiles;

create trigger set_student_profiles_updated_at
before update on public.student_profiles
for each row
execute function public.set_updated_at();

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
    coalesce(
      new.raw_user_meta_data ->> 'level',
      'beginner'
    )
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

drop trigger if exists on_codcraft_auth_user_created
on auth.users;

create trigger on_codcraft_auth_user_created
after insert or update of raw_user_meta_data, email
on auth.users
for each row
execute function public.handle_new_codcraft_user();

commit;
