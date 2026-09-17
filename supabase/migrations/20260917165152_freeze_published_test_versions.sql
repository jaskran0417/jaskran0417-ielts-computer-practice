alter policy test_versions_update_staff
on public.test_versions
using (
  private.current_user_role() in ('admin', 'teacher')
  and published_at is null
)
with check (private.current_user_role() in ('admin', 'teacher'));

alter policy test_versions_delete_staff
on public.test_versions
using (
  private.current_user_role() in ('admin', 'teacher')
  and published_at is null
);
