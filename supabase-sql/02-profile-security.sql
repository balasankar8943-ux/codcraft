begin;

alter table public.student_profiles enable row level security;

drop policy if exists "read own profile"
on public.student_profiles;

drop policy if exists "students can read their profile"
on public.student_profiles;

create policy "students can read their profile"
on public.student_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "insert own profile"
on public.student_profiles;

drop policy if exists "students can insert their profile"
on public.student_profiles;

create policy "students can insert their profile"
on public.student_profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "update own profile"
on public.student_profiles;

drop policy if exists "students can update their profile"
on public.student_profiles;

create policy "students can update their profile"
on public.student_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.student_profiles from anon;
grant select, insert, update on table public.student_profiles to authenticated;

commit;
