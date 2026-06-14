begin;

insert into public.student_profiles (
  id,
  email,
  full_name,
  college,
  level
)
select
  id,
  email,
  coalesce(
    raw_user_meta_data ->> 'name',
    raw_user_meta_data ->> 'full_name',
    split_part(email, '@', 1)
  ),
  coalesce(
    raw_user_meta_data ->> 'college',
    'Kerala Engineering Student'
  ),
  coalesce(
    raw_user_meta_data ->> 'level',
    'beginner'
  )
from auth.users
where email is not null
on conflict (id) do nothing;

commit;
