alter function public.publish_imported_reading_test(uuid, text, jsonb, jsonb)
  security invoker;

revoke all on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb) from public;
revoke all on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb) from anon;
grant execute on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb) to authenticated;

comment on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb) is
  'Atomically publishes a student-safe Reading test version and separate protected answer definitions. Runs as the signed-in caller so existing RLS remains authoritative.';
