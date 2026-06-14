create index if not exists student_progress_score_index
on public.student_progress (
  score desc,
  updated_at asc
);
