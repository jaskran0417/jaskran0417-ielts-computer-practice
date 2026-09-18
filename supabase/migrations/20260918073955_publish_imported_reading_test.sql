create or replace function public.publish_imported_reading_test(
  p_test_id uuid,
  p_title text,
  p_student_content jsonb,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_test_id uuid := coalesce(p_test_id, gen_random_uuid());
  v_existing_test_id uuid;
  v_version_id uuid := gen_random_uuid();
  v_version_number integer;
  v_student_content jsonb;
  v_question_count integer;
  v_distinct_question_count integer;
  v_answer_count integer;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  if coalesce(private.current_user_role()::text, '') not in ('admin', 'teacher') then
    raise exception using
      errcode = '42501',
      message = 'Only staff can publish imported tests';
  end if;

  if nullif(btrim(p_title), '') is null or char_length(p_title) > 200 then
    raise exception using
      errcode = '22023',
      message = 'Test title must contain 1 to 200 characters';
  end if;

  if p_student_content is null or jsonb_typeof(p_student_content) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Student test content must be a JSON object';
  end if;

  if p_answers is null
     or jsonb_typeof(p_answers) <> 'object'
     or p_answers = '{}'::jsonb then
    raise exception using
      errcode = '22023',
      message = 'Protected answer definitions are required';
  end if;

  if jsonb_path_exists(p_student_content, '$.**.correctAnswer')
     or jsonb_path_exists(p_student_content, '$.**.correctAnswers')
     or jsonb_path_exists(p_student_content, '$.**.answerKey')
     or jsonb_path_exists(p_student_content, '$.**.answerKeys')
     or jsonb_path_exists(p_student_content, '$.**.answerDefinitions')
     or jsonb_path_exists(p_student_content, '$.**.protectedAnswers')
     or jsonb_path_exists(p_student_content, '$.**.canonical')
     or jsonb_path_exists(p_student_content, '$.**.alternatives') then
    raise exception using
      errcode = '22023',
      message = 'Student test content contains protected answer data';
  end if;

  if p_student_content #>> '{modules,0,kind}' is distinct from 'READING' then
    raise exception using
      errcode = '22023',
      message = 'Imported Reading publication requires a Reading student package';
  end if;

  select count(*), count(distinct (q.value #>> '{}'))
  into v_question_count, v_distinct_question_count
  from jsonb_path_query(
    p_student_content,
    '$.modules[*].sections[*].questionGroups[*].questions[*].id'
  ) as q(value);

  select count(*)
  into v_answer_count
  from jsonb_object_keys(p_answers);

  if v_question_count = 0 then
    raise exception using
      errcode = '22023',
      message = 'Student test package contains no questions';
  end if;

  if v_distinct_question_count <> v_question_count then
    raise exception using
      errcode = '22023',
      message = 'Student test package contains duplicate question IDs';
  end if;

  if v_answer_count <> v_question_count then
    raise exception using
      errcode = '22023',
      message = 'Protected answer coverage must match the student question count';
  end if;

  if exists (
    select 1
    from jsonb_path_query(
      p_student_content,
      '$.modules[*].sections[*].questionGroups[*].questions[*].id'
    ) as q(value)
    where not (p_answers ? (q.value #>> '{}'))
  ) then
    raise exception using
      errcode = '22023',
      message = 'Every student question must have one protected answer definition';
  end if;

  if exists (
    select 1
    from jsonb_each(p_answers) as answer(question_id, definition)
    where coalesce(definition ->> 'verificationState', '') not in ('VERIFIED', 'CONFIRMED')
       or coalesce(jsonb_typeof(definition -> 'canonical'), '') <> 'array'
       or jsonb_array_length(coalesce(definition -> 'canonical', '[]'::jsonb)) = 0
  ) then
    raise exception using
      errcode = '22023',
      message = 'Protected answers must be verified or confirmed and contain a canonical answer';
  end if;

  select id
  into v_existing_test_id
  from public.tests
  where id = v_test_id
  for update;

  if v_existing_test_id is null then
    insert into public.tests (id, title, status, created_by)
    values (v_test_id, btrim(p_title), 'draft'::public.test_status, v_user_id);
  else
    update public.tests
    set title = btrim(p_title),
        updated_at = now()
    where id = v_test_id;
  end if;

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

  update public.test_versions
  set published_at = now()
  where id = v_version_id;

  update public.tests
  set status = 'published'::public.test_status,
      updated_at = now()
  where id = v_test_id;

  return jsonb_build_object(
    'test_id', v_test_id,
    'version_id', v_version_id,
    'version_number', v_version_number
  );
end;
$$;

revoke all on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb) from public;
grant execute on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb) to authenticated;

comment on function public.publish_imported_reading_test(uuid, text, jsonb, jsonb) is
  'Atomically publishes a student-safe Reading test version and separate protected answer definitions for authenticated staff.';
