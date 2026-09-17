create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

alter policy profiles_select_self_or_staff
on public.profiles
using (
  user_id = auth.uid()
  or private.current_user_role() in ('admin', 'teacher')
);

alter policy tests_select_published_or_staff
on public.tests
using (
  status = 'published'
  or private.current_user_role() in ('admin', 'teacher')
);

alter policy tests_insert_staff
on public.tests
with check (
  private.current_user_role() in ('admin', 'teacher')
  and created_by = auth.uid()
);

alter policy tests_update_staff
on public.tests
using (private.current_user_role() in ('admin', 'teacher'))
with check (private.current_user_role() in ('admin', 'teacher'));

alter policy tests_delete_staff
on public.tests
using (private.current_user_role() in ('admin', 'teacher'));

alter policy test_versions_select_published_or_staff
on public.test_versions
using (
  (
    published_at is not null
    and exists (
      select 1
      from public.tests
      where tests.id = test_versions.test_id
        and tests.status = 'published'
    )
  )
  or private.current_user_role() in ('admin', 'teacher')
);

alter policy test_versions_insert_staff
on public.test_versions
with check (
  private.current_user_role() in ('admin', 'teacher')
  and created_by = auth.uid()
);

alter policy test_versions_update_staff
on public.test_versions
using (private.current_user_role() in ('admin', 'teacher'))
with check (private.current_user_role() in ('admin', 'teacher'));

alter policy test_versions_delete_staff
on public.test_versions
using (private.current_user_role() in ('admin', 'teacher'));

alter policy attempts_select_own_or_staff
on public.attempts
using (
  user_id = auth.uid()
  or private.current_user_role() in ('admin', 'teacher')
);

alter policy responses_select_own_or_staff
on public.attempt_responses
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and (
        attempts.user_id = auth.uid()
        or private.current_user_role() in ('admin', 'teacher')
      )
  )
);

drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

drop function public.handle_new_user();
drop function public.current_user_role();
