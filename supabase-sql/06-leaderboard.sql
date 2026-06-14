begin;

drop function if exists public.get_codcraft_leaderboard(integer);

create function public.get_codcraft_leaderboard(
  result_limit integer default 100
)
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
  order by progress.score desc, progress.updated_at asc
  limit greatest(
    1,
    least(coalesce(result_limit, 100), 100)
  );
$$;

revoke all on function public.get_codcraft_leaderboard(integer)
from public, anon;

grant execute on function public.get_codcraft_leaderboard(integer)
to authenticated;

commit;
