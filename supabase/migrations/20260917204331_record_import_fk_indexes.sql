create index if not exists source_documents_created_by_idx on public.source_documents(created_by);
create index if not exists extraction_runs_created_by_idx on public.extraction_runs(created_by);
create index if not exists verification_records_created_by_idx on public.verification_records(created_by);
create index if not exists verification_records_pass_a_extraction_id_idx on public.verification_records(pass_a_extraction_id);
create index if not exists verification_records_pass_b_extraction_id_idx on public.verification_records(pass_b_extraction_id);
create index if not exists answer_definitions_created_by_idx on public.answer_definitions(created_by);
