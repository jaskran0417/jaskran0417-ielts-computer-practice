create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  kind text not null check (kind in ('PDF', 'IMAGE', 'ANSWER_KEY', 'AUDIO', 'OTHER')),
  name text not null check (char_length(name) between 1 and 500),
  media_type text not null check (char_length(media_type) between 1 and 200),
  size_bytes bigint not null check (size_bytes >= 0),
  source_uri text,
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.source_regions (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  x double precision,
  y double precision,
  width double precision,
  height double precision,
  label text,
  created_at timestamptz not null default now(),
  check (
    (x is null and y is null and width is null and height is null)
    or (
      x between 0 and 1
      and y between 0 and 1
      and width > 0 and width <= 1
      and height > 0 and height <= 1
      and x + width <= 1
      and y + height <= 1
    )
  )
);

create table public.extraction_runs (
  id uuid primary key default gen_random_uuid(),
  source_region_id uuid not null references public.source_regions(id) on delete cascade,
  method text not null check (method in ('PDF_TEXT', 'OCR_A', 'OCR_B', 'ANSWER_KEY_A', 'ANSWER_KEY_B', 'MANUAL')),
  value text not null,
  confidence double precision check (confidence is null or confidence between 0 and 100),
  engine text,
  engine_version text,
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.verification_records (
  id uuid primary key default gen_random_uuid(),
  test_version_id uuid not null references public.test_versions(id) on delete cascade,
  field_key text not null check (char_length(field_key) between 1 and 300),
  field_kind text not null check (field_kind in ('QUESTION_TEXT', 'INSTRUCTION', 'PASSAGE_TEXT', 'ANSWER', 'OPTION', 'OTHER')),
  critical boolean not null default false,
  state text not null check (state in ('VERIFIED', 'CONFIRMED', 'REVIEW_REQUIRED', 'UNREADABLE')),
  normalized_value text,
  confirmed_value text,
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  pass_a_extraction_id uuid references public.extraction_runs(id) on delete restrict,
  pass_b_extraction_id uuid references public.extraction_runs(id) on delete restrict,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_version_id, field_key),
  check (state <> 'VERIFIED' or nullif(btrim(normalized_value), '') is not null),
  check (state <> 'CONFIRMED' or nullif(btrim(confirmed_value), '') is not null)
);

create table public.answer_definitions (
  id uuid primary key default gen_random_uuid(),
  test_version_id uuid not null references public.test_versions(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 200),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_version_id, question_id)
);

create index source_documents_test_id_idx on public.source_documents(test_id);
create index source_regions_source_document_id_idx on public.source_regions(source_document_id);
create index extraction_runs_source_region_id_idx on public.extraction_runs(source_region_id);
create index verification_records_test_version_id_idx on public.verification_records(test_version_id);
create index verification_records_unresolved_critical_idx on public.verification_records(test_version_id)
  where critical and state in ('REVIEW_REQUIRED', 'UNREADABLE');
create index answer_definitions_test_version_id_idx on public.answer_definitions(test_version_id);

alter table public.source_documents enable row level security;
alter table public.source_regions enable row level security;
alter table public.extraction_runs enable row level security;
alter table public.verification_records enable row level security;
alter table public.answer_definitions enable row level security;

revoke all on table public.source_documents from anon;
revoke all on table public.source_regions from anon;
revoke all on table public.extraction_runs from anon;
revoke all on table public.verification_records from anon;
revoke all on table public.answer_definitions from anon;

grant select, insert, update, delete on table public.source_documents to authenticated;
grant select, insert, update, delete on table public.source_regions to authenticated;
grant select, insert, update, delete on table public.extraction_runs to authenticated;
grant select, insert, update, delete on table public.verification_records to authenticated;
grant select, insert, update, delete on table public.answer_definitions to authenticated;

create policy source_documents_select_staff
on public.source_documents for select
to authenticated
using (private.current_user_role() in ('admin', 'teacher'));

create policy source_documents_insert_staff
on public.source_documents for insert
to authenticated
with check (
  private.current_user_role() in ('admin', 'teacher')
  and created_by = (select auth.uid())
);

create policy source_documents_update_unpublished_staff
on public.source_documents for update
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and not exists (
    select 1 from public.test_versions tv
    where tv.test_id = source_documents.test_id and tv.published_at is not null
  )
)
with check (
  private.current_user_role() in ('admin', 'teacher')
  and not exists (
    select 1 from public.test_versions tv
    where tv.test_id = source_documents.test_id and tv.published_at is not null
  )
);

create policy source_documents_delete_unpublished_staff
on public.source_documents for delete
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and not exists (
    select 1 from public.test_versions tv
    where tv.test_id = source_documents.test_id and tv.published_at is not null
  )
);

create policy source_regions_select_staff
on public.source_regions for select
to authenticated
using (private.current_user_role() in ('admin', 'teacher'));

create policy source_regions_insert_staff
on public.source_regions for insert
to authenticated
with check (private.current_user_role() in ('admin', 'teacher'));

create policy source_regions_update_unpublished_staff
on public.source_regions for update
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and not exists (
    select 1
    from public.source_documents sd
    join public.test_versions tv on tv.test_id = sd.test_id
    where sd.id = source_regions.source_document_id and tv.published_at is not null
  )
)
with check (private.current_user_role() in ('admin', 'teacher'));

create policy source_regions_delete_unpublished_staff
on public.source_regions for delete
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and not exists (
    select 1
    from public.source_documents sd
    join public.test_versions tv on tv.test_id = sd.test_id
    where sd.id = source_regions.source_document_id and tv.published_at is not null
  )
);

create policy extraction_runs_select_staff
on public.extraction_runs for select
to authenticated
using (private.current_user_role() in ('admin', 'teacher'));

create policy extraction_runs_insert_staff
on public.extraction_runs for insert
to authenticated
with check (
  private.current_user_role() in ('admin', 'teacher')
  and created_by = (select auth.uid())
);

create policy extraction_runs_update_unpublished_staff
on public.extraction_runs for update
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and not exists (
    select 1
    from public.source_regions sr
    join public.source_documents sd on sd.id = sr.source_document_id
    join public.test_versions tv on tv.test_id = sd.test_id
    where sr.id = extraction_runs.source_region_id and tv.published_at is not null
  )
)
with check (private.current_user_role() in ('admin', 'teacher'));

create policy extraction_runs_delete_unpublished_staff
on public.extraction_runs for delete
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and not exists (
    select 1
    from public.source_regions sr
    join public.source_documents sd on sd.id = sr.source_document_id
    join public.test_versions tv on tv.test_id = sd.test_id
    where sr.id = extraction_runs.source_region_id and tv.published_at is not null
  )
);

create policy verification_records_select_staff
on public.verification_records for select
to authenticated
using (private.current_user_role() in ('admin', 'teacher'));

create policy verification_records_insert_unpublished_staff
on public.verification_records for insert
to authenticated
with check (
  private.current_user_role() in ('admin', 'teacher')
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.test_versions tv
    where tv.id = verification_records.test_version_id and tv.published_at is null
  )
);

create policy verification_records_update_unpublished_staff
on public.verification_records for update
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and exists (
    select 1 from public.test_versions tv
    where tv.id = verification_records.test_version_id and tv.published_at is null
  )
)
with check (
  private.current_user_role() in ('admin', 'teacher')
  and exists (
    select 1 from public.test_versions tv
    where tv.id = verification_records.test_version_id and tv.published_at is null
  )
);

create policy verification_records_delete_unpublished_staff
on public.verification_records for delete
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and exists (
    select 1 from public.test_versions tv
    where tv.id = verification_records.test_version_id and tv.published_at is null
  )
);

create policy answer_definitions_select_staff
on public.answer_definitions for select
to authenticated
using (private.current_user_role() in ('admin', 'teacher'));

create policy answer_definitions_insert_unpublished_staff
on public.answer_definitions for insert
to authenticated
with check (
  private.current_user_role() in ('admin', 'teacher')
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.test_versions tv
    where tv.id = answer_definitions.test_version_id and tv.published_at is null
  )
);

create policy answer_definitions_update_unpublished_staff
on public.answer_definitions for update
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and exists (
    select 1 from public.test_versions tv
    where tv.id = answer_definitions.test_version_id and tv.published_at is null
  )
)
with check (
  private.current_user_role() in ('admin', 'teacher')
  and exists (
    select 1 from public.test_versions tv
    where tv.id = answer_definitions.test_version_id and tv.published_at is null
  )
);

create policy answer_definitions_delete_unpublished_staff
on public.answer_definitions for delete
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  and exists (
    select 1 from public.test_versions tv
    where tv.id = answer_definitions.test_version_id and tv.published_at is null
  )
);

comment on table public.answer_definitions is
  'Protected scoring definitions. Never expose this table in student payloads or student-facing policies.';
comment on table public.verification_records is
  'Importer verification state and evidence links. Critical unresolved records block publication.';
