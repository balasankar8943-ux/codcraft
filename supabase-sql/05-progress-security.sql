begin;

alter table public.student_progress enable row level security;

drop policy if exists "read own progress"
on public.student_progress;

drop policy if exists "students can read their progress"
on public.student_progress;

create policy "students can read their progress"
on public.student_progress
for select
to authenticated
using (
  (select auth.uid()) is not null
  and email = (select auth.jwt() ->> 'email')
);

drop policy if exists "insert own progress"
on public.student_progress;

drop policy if exists "students can upsert their progress"
on public.student_progress;

create policy "students can upsert their progress"
on public.student_progress
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and email = (select auth.jwt() ->> 'email')
);

drop policy if exists "update own progress"
on public.student_progress;

drop policy if exists "students can update their progress"
on public.student_progress;

create policy "students can update their progress"
on public.student_progress
for update
to authenticated
using (
  (select auth.uid()) is not null
  and email = (select auth.jwt() ->> 'email')
)
with check (
  (select auth.uid()) is not null
  and email = (select auth.jwt() ->> 'email')
);

revoke all on table public.student_progress from anon;
grant select, insert, update on table public.student_progress to authenticated;

commit;
