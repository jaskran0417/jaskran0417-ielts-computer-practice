create type public.user_role as enum ('admin', 'teacher', 'student');
create type public.test_status as enum ('draft', 'published', 'archived');
create type public.attempt_status as enum ('active', 'pending_sync', 'submitted');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  display_name text,
  created_at timestamptz not null default now()
);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  status public.test_status not null default 'draft',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.test_versions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content jsonb not null,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (test_id, version_number)
);

create table public.attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  test_version_id uuid not null references public.test_versions(id),
  status public.attempt_status not null default 'active',
  started_at timestamptz not null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'submitted' and submitted_at is not null) or status <> 'submitted')
);

create table public.attempt_responses (
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 200),
  response jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create index tests_status_idx on public.tests(status);
create index test_versions_test_id_idx on public.test_versions(test_id);
create index attempts_user_id_idx on public.attempts(user_id);
create index attempts_test_version_id_idx on public.attempts(test_version_id);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.handle_new_user()
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.tests enable row level security;
alter table public.test_versions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_responses enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.tests from anon;
revoke all on table public.test_versions from anon;
revoke all on table public.attempts from anon;
revoke all on table public.attempt_responses from anon;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.tests to authenticated;
grant select, insert, update, delete on table public.test_versions to authenticated;
grant select, insert, update on table public.attempts to authenticated;
grant select, insert, update on table public.attempt_responses to authenticated;

create policy profiles_select_self_or_staff
on public.profiles for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() in ('admin', 'teacher')
);

create policy tests_select_published_or_staff
on public.tests for select
to authenticated
using (
  status = 'published'
  or public.current_user_role() in ('admin', 'teacher')
);

create policy tests_insert_staff
on public.tests for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'teacher')
  and created_by = auth.uid()
);

create policy tests_update_staff
on public.tests for update
to authenticated
using (public.current_user_role() in ('admin', 'teacher'))
with check (public.current_user_role() in ('admin', 'teacher'));

create policy tests_delete_staff
on public.tests for delete
to authenticated
using (public.current_user_role() in ('admin', 'teacher'));

create policy test_versions_select_published_or_staff
on public.test_versions for select
to authenticated
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
  or public.current_user_role() in ('admin', 'teacher')
);

create policy test_versions_insert_staff
on public.test_versions for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'teacher')
  and created_by = auth.uid()
);

create policy test_versions_update_staff
on public.test_versions for update
to authenticated
using (public.current_user_role() in ('admin', 'teacher'))
with check (public.current_user_role() in ('admin', 'teacher'));

create policy test_versions_delete_staff
on public.test_versions for delete
to authenticated
using (public.current_user_role() in ('admin', 'teacher'));

create policy attempts_select_own_or_staff
on public.attempts for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() in ('admin', 'teacher')
);

create policy attempts_insert_own
on public.attempts for insert
to authenticated
with check (user_id = auth.uid());

create policy attempts_update_own
on public.attempts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy responses_select_own_or_staff
on public.attempt_responses for select
to authenticated
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.current_user_role() in ('admin', 'teacher')
      )
  )
);

create policy responses_insert_own
on public.attempt_responses for insert
to authenticated
with check (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and attempts.user_id = auth.uid()
  )
);

create policy responses_update_own
on public.attempt_responses for update
to authenticated
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and attempts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and attempts.user_id = auth.uid()
  )
);

comment on column public.test_versions.content is
  'Student-safe immutable test payload only. Protected answer definitions must never be stored in this column.';
