create index tests_created_by_idx on public.tests(created_by);
create index test_versions_created_by_idx on public.test_versions(created_by);

alter policy profiles_select_self_or_staff
on public.profiles
using (
  user_id = (select auth.uid())
  or private.current_user_role() in ('admin', 'teacher')
);

alter policy tests_insert_staff
on public.tests
with check (
  private.current_user_role() in ('admin', 'teacher')
  and created_by = (select auth.uid())
);

alter policy test_versions_insert_staff
on public.test_versions
with check (
  private.current_user_role() in ('admin', 'teacher')
  and created_by = (select auth.uid())
);

alter policy attempts_select_own_or_staff
on public.attempts
using (
  user_id = (select auth.uid())
  or private.current_user_role() in ('admin', 'teacher')
);

alter policy attempts_insert_own
on public.attempts
with check (user_id = (select auth.uid()));

alter policy attempts_update_own
on public.attempts
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter policy responses_select_own_or_staff
on public.attempt_responses
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and (
        attempts.user_id = (select auth.uid())
        or private.current_user_role() in ('admin', 'teacher')
      )
  )
);

alter policy responses_insert_own
on public.attempt_responses
with check (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and attempts.user_id = (select auth.uid())
  )
);

alter policy responses_update_own
on public.attempt_responses
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and attempts.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and attempts.user_id = (select auth.uid())
  )
);
