create or replace function public.score_objective_attempt(
  p_attempt_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.score_objective_attempt(p_attempt_id);
$$;

revoke all on function public.score_objective_attempt(uuid) from public;
revoke all on function public.score_objective_attempt(uuid) from anon;
grant execute on function public.score_objective_attempt(uuid) to authenticated;

comment on function public.score_objective_attempt(uuid) is
  'Authenticated SECURITY INVOKER wrapper for protected objective scoring.';
