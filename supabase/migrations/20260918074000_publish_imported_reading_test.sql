create or replace function public.publish_imported_reading_test(
  p_test_id uuid,
  p_title text,
  p_student_content jsonb,
  p_answers jsonb
)
returns table (
  test_id uuid,
  version_id uuid,
  version_number integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_test_id uuid;
  v_version_id uuid := gen_random_uuid();
  v_version_number integer;
  v_student_content jsonb;
  v_question_count integer;
  v_answer_count integer;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to publish a test';
  end if;

  if private.current_user_role() not in ('admin', 'teacher') then
    raise exception using
      errcode = '42501',
      message = 'Only staff can publish imported tests';
  end if;

  if nullif(btrim(p_title), '') is null
     or char_length(btrim(p_title)) > 200 then
    raise exception using
      errcode = '22023',
      message = 'Test title must contain 1 to 200 characters';
  end if;

  if jsonb_typeof(p_student_content) is distinct from 'object' then
    raise exception using
      errcode = '22023',
      message = 'Student test content must be a JSON object';
  end if;

  if jsonb_typeof(p_student_content -> 'modules') is distinct from 'array'
     or jsonb_array_length(p_student_content -> 'modules') = 0 then
    raise exception using
      errcode = '22023',
      message = 'Student test content must contain at least one module';
  end if;

  if jsonb_typeof(p_answers) is distinct from 'object'
     or p_answers = '{}'::jsonb then
    raise exception using
      errcode = '22023',
      message = 'Protected answer definitions are required for Reading publication';
  end if;

  if
    jsonb_path_exists(p_student_content, '$.**."correctAnswer"')
    or jsonb_path_exists(p_student_content, '$.**."correctAnswers"')
    or jsonb_path_exists(p_student_content, '$.**."answerKey"')
    or jsonb_path_exists(p_student_content, '$.**."answerKeys"')
    or jsonb_path_exists(p_student_content, '$.**."answerDefinitions"')
    or jsonb_path_exists(p_student_content, '$.**."protectedAnswers"')
  then
    raise exception using
      errcode = '22023',
      message = 'Student test content contains protected answer data';
  end if;

  if exists (
    select 1
    from jsonb_each(p_answers) as answer(question_id, definition)
    where nullif(btrim(answer.question_id), '') is null
       or jsonb_typeof(answer.definition) is distinct from 'object'
       or coalesce(answer.definition ->> 'verificationState', '') not in ('VERIFIED', 'CONFIRMED')
  ) then
    raise exception using
      errcode = '22023',
      message = 'Every protected answer must be a verified or confirmed definition object';
  end if;

  with student_questions as (
    select value #>> '{}' as question_id
    from jsonb_path_query(
      p_student_content,
      '$.modules[*].sections[*].questionGroups[*].questions[*].id'
    ) as question(value)
  )
  select count(*), count(distinct question_id)
  into v_question_count, v_answer_count
  from student_questions;

  if v_question_count = 0 or v_question_count <> v_answer_count then
    raise exception using
      errcode = '22023',
      message = 'Student test questions must have unique non-empty IDs';
  end if;

  select count(*)
  into v_answer_count
  from jsonb_object_keys(p_answers);

  if v_answer_count <> v_question_count then
    raise exception using
      errcode = '22023',
      message = 'Protected answer coverage must exactly match student questions';
  end if;

  if exists (
    with student_questions as (
      select value #>> '{}' as question_id
      from jsonb_path_query(
        p_student_content,
        '$.modules[*].sections[*].questionGroups[*].questions[*].id'
      ) as question(value)
    )
    select 1
    from student_questions
    where not (p_answers ? question_id)
  ) or exists (
    with student_questions as (
      select value #>> '{}' as question_id
      from jsonb_path_query(
        p_student_content,
        '$.modules[*].sections[*].questionGroups[*].questions[*].id'
      ) as question(value)
    )
    select 1
    from jsonb_object_keys(p_answers) as answer_keys(answer_id)
    where not exists (
      select 1
      from student_questions
      where student_questions.question_id = answer_keys.answer_id
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Protected answer IDs must exactly match student question IDs';
  end if;

  if p_test_id is null then
    insert into public.tests (title, status, created_by)
    values (btrim(p_title), 'draft'::public.test_status, v_user_id)
    returning id into v_test_id;
  else
    select tests.id
    into v_test_id
    from public.tests
    where tests.id = p_test_id
    for update;

    if v_test_id is null then
      insert into public.tests (id, title, status, created_by)
      values (
        p_test_id,
        btrim(p_title),
        'draft'::public.test_status,
        v_user_id
      )
      returning id into v_test_id;
    else
      update public.tests
      set title = btrim(p_title),
          updated_at = now()
      where tests.id = v_test_id;
    end if;
  end if;

  perform 1
  from public.tests
  where tests.id = v_test_id
  for update;

  select coalesce(max(tv.version_number), 0) + 1
  into v_version_number
  from public.test_versions tv
  where tv.test_id = v_test_id;

  v_student_content :=
    jsonb_set(
      jsonb_set(
        p_student_content,
        '{id}',
        to_jsonb(v_test_id::text),
        true
      ),
      '{versionId}',
      to_jsonb(v_version_id::text),
      true
    );

  insert into public.test_versions (
    id,
    test_id,
    version_number,
    content,
    published_at,
    created_by
  )
  values (
    v_version_id,
    v_test_id,
    v_version_number,
    v_student_content,
    null,
    v_user_id
  );

  insert into public.answer_definitions (
    test_version_id,
    question_id,
    definition,
    created_by
  )
  select
    v_version_id,
    answer.question_id,
    answer.definition,
    v_user_id
  from jsonb_each(p_answers) as answer(question_id, definition);

  insert into public.verification_records (
    test_version_id,
    field_key,
    field_kind,
    critical,
    state,
    normalized_value,
    confirmed_value,
    reasons,
    created_by
  )
  select
    v_version_id,
    'answer:' || answer.question_id,
    'ANSWER',
    true,
    answer.definition ->> 'verificationState',
    case
      when answer.definition ->> 'verificationState' = 'VERIFIED'
      then coalesce(answer.definition -> 'canonical' ->> 0, answer.question_id)
      else null
    end,
    case
      when answer.definition ->> 'verificationState' = 'CONFIRMED'
      then coalesce(answer.definition -> 'canonical' ->> 0, answer.question_id)
      else null
    end,
    '[]'::jsonb,
    v_user_id
  from jsonb_each(p_answers) as answer(question_id, definition);

  update public.test_versions
  set published_at = now()
  where test_versions.id = v_version_id;

  update public.tests
  set status = 'published'::public.test_status,
      updated_at = now()
  where tests.id = v_test_id;

  return query
  select v_test_id, v_version_id, v_version_number;
end;
$$;

revoke all on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb)
from public, anon;

grant execute on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb)
to authenticated;

comment on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb) is
  'Atomically publishes one student-safe Reading version and its protected answer definitions. Staff only.';
