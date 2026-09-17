create or replace function private.guard_test_version_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published_at is not null
     and (tg_op = 'INSERT' or old.published_at is null) then
    if exists (
      select 1
      from public.verification_records vr
      where vr.test_version_id = new.id
        and vr.critical
        and vr.state not in ('VERIFIED', 'CONFIRMED')
    ) then
      raise exception using
        errcode = '23514',
        message = 'Cannot publish test version while critical imported fields are unresolved';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.guard_test_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published'::public.test_status
     and (tg_op = 'INSERT' or old.status is distinct from 'published'::public.test_status) then
    if exists (
      select 1
      from public.test_versions tv
      join public.verification_records vr on vr.test_version_id = tv.id
      where tv.test_id = new.id
        and vr.critical
        and vr.state not in ('VERIFIED', 'CONFIRMED')
    ) then
      raise exception using
        errcode = '23514',
        message = 'Cannot publish test while critical imported fields are unresolved';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_test_version_publication() from public;
revoke all on function private.guard_test_publication() from public;

create trigger guard_test_version_publication
before insert or update of published_at on public.test_versions
for each row execute function private.guard_test_version_publication();

create trigger guard_test_publication
before insert or update of status on public.tests
for each row execute function private.guard_test_publication();
