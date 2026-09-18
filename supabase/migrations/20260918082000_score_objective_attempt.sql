alter table public.attempts
  add column if not exists raw_score integer,
  add column if not exists total_questions integer,
  add column if not exists scored_at timestamptz;

alter table public.attempts
  drop constraint if exists attempts_score_bounds_check;

alter table public.attempts
  add constraint attempts_score_bounds_check
  check (
    (raw_score is null and total_questions is null and scored_at is null)
    or (
      raw_score is not null
      and total_questions is not null
      and scored_at is not null
      and raw_score >= 0
      and total_questions > 0
      and raw_score <= total_questions
    )
  );

create or replace function private.normalize_scoring_text(
  p_value text,
  p_policy jsonb
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_value text := btrim(coalesce(p_value, ''));
  v_punctuation text := coalesce(p_policy ->> 'punctuation', 'STRICT');
  v_case_sensitive boolean := coalesce((p_policy ->> 'caseSensitive')::boolean, false);
  v_collapse boolean := coalesce((p_policy ->> 'collapseWhitespace')::boolean, true);
begin
  if v_punctuation = 'IGNORE_TERMINAL' then
    v_value := regexp_replace(v_value, '[\.,!\?;:]+$', '', 'g');
  elsif v_punctuation = 'LENIENT' then
    v_value := regexp_replace(v_value, '[\.,!\?;:''"()\[\]{}-]+', ' ', 'g');
  end if;

  if v_collapse then
    v_value := regexp_replace(btrim(v_value), '\s+', ' ', 'g');
  end if;

  if not v_case_sensitive then
    v_value := lower(v_value);
  end if;

  return v_value;
end;
$$;

create or replace function private.normalize_scoring_group(
  p_value jsonb,
  p_policy jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_items text[] := array[]::text[];
  v_item jsonb;
  v_order_sensitive boolean := coalesce((p_policy ->> 'orderSensitive')::boolean, true);
begin
  if p_value is null then
    return null;
  end if;

  if jsonb_typeof(p_value) = 'string' then
    v_items := array_append(
      v_items,
      private.normalize_scoring_text(p_value #>> '{}', p_policy)
    );
  elsif jsonb_typeof(p_value) = 'array' then
    for v_item in select value from jsonb_array_elements(p_value)
    loop
      if jsonb_typeof(v_item) <> 'string' then
        return null;
      end if;
      v_items := array_append(
        v_items,
        private.normalize_scoring_text(v_item #>> '{}', p_policy)
      );
    end loop;
  else
    return null;
  end if;

  if not v_order_sensitive then
    select coalesce(array_agg(value order by value), array[]::text[])
    into v_items
    from unnest(v_items) as value;
  end if;

  return to_jsonb(v_items);
end;
$$;

create or replace function private.scoring_max_words_exceeded(
  p_value jsonb,
  p_policy jsonb
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_max_words integer;
  v_item jsonb;
  v_text text;
  v_count integer;
begin
  if p_policy ->> 'maxWords' is null then
    return false;
  end if;

  v_max_words := (p_policy ->> 'maxWords')::integer;
  if v_max_words <= 0 then
    return false;
  end if;

  if jsonb_typeof(p_value) = 'string' then
    p_value := jsonb_build_array(p_value);
  elsif jsonb_typeof(p_value) <> 'array' then
    return true;
  end if;

  for v_item in select value from jsonb_array_elements(p_value)
  loop
    if jsonb_typeof(v_item) <> 'string' then
      return true;
    end if;

    v_text := private.normalize_scoring_text(
      v_item #>> '{}',
      jsonb_set(p_policy, '{punctuation}', '"LENIENT"'::jsonb, true)
    );

    if v_text = '' then
      v_count := 0;
    else
      v_count := cardinality(regexp_split_to_array(v_text, '\s+'));
    end if;

    if v_count > v_max_words then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

drop policy if exists responses_insert_own on public.attempt_responses;
drop policy if exists responses_update_own on public.attempt_responses;
drop policy if exists responses_insert_active_own on public.attempt_responses;
drop policy if exists responses_update_active_own on public.attempt_responses;

create policy responses_insert_active_own
on public.attempt_responses for insert
to authenticated
with check (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and attempts.user_id = (select auth.uid())
      and attempts.status = 'active'::public.attempt_status
  )
);

create policy responses_update_active_own
on public.attempt_responses for update
to authenticated
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and attempts.user_id = (select auth.uid())
      and attempts.status = 'active'::public.attempt_status
  )
)
with check (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_responses.attempt_id
      and attempts.user_id = (select auth.uid())
      and attempts.status = 'active'::public.attempt_status
  )
);

create or replace function public.score_objective_attempt(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.attempts%rowtype;
  v_staff boolean;
  v_answer record;
  v_response jsonb;
  v_policy jsonb;
  v_normalized_response jsonb;
  v_expected jsonb;
  v_alternative jsonb;
  v_correct boolean;
  v_raw_score integer := 0;
  v_total_questions integer := 0;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  select *
  into v_attempt
  from public.attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Attempt not found';
  end if;

  v_staff := coalesce(private.current_user_role()::text, '') in ('admin', 'teacher');

  if v_attempt.user_id <> v_user_id and not v_staff then
    raise exception using
      errcode = '42501',
      message = 'You cannot score this attempt';
  end if;

  if v_attempt.status <> 'submitted'::public.attempt_status
     or v_attempt.submitted_at is null then
    raise exception using
      errcode = '22023',
      message = 'Attempt must be submitted before scoring';
  end if;

  if v_attempt.scored_at is not null then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'test_version_id', v_attempt.test_version_id,
      'raw_score', v_attempt.raw_score,
      'total_questions', v_attempt.total_questions
    );
  end if;

  for v_answer in
    select question_id, definition
    from public.answer_definitions
    where test_version_id = v_attempt.test_version_id
    order by question_id
  loop
    v_total_questions := v_total_questions + 1;
    v_correct := false;
    v_policy := coalesce(v_answer.definition -> 'normalization', '{}'::jsonb);

    select response
    into v_response
    from public.attempt_responses
    where attempt_id = v_attempt.id
      and question_id = v_answer.question_id;

    if found and not private.scoring_max_words_exceeded(v_response, v_policy) then
      v_normalized_response := private.normalize_scoring_group(v_response, v_policy);
      v_expected := private.normalize_scoring_group(
        v_answer.definition -> 'canonical',
        v_policy
      );

      if v_normalized_response is not null
         and v_expected is not null
         and v_normalized_response = v_expected then
        v_correct := true;
      else
        for v_alternative in
          select value
          from jsonb_array_elements(
            coalesce(v_answer.definition -> 'alternatives', '[]'::jsonb)
          )
        loop
          v_expected := private.normalize_scoring_group(v_alternative, v_policy);
          if v_normalized_response is not null
             and v_expected is not null
             and v_normalized_response = v_expected then
            v_correct := true;
            exit;
          end if;
        end loop;
      end if;
    end if;

    if v_correct then
      v_raw_score := v_raw_score + 1;
    end if;
  end loop;

  if v_total_questions = 0 then
    raise exception using
      errcode = '22023',
      message = 'No protected answer definitions exist for this test version';
  end if;

  update public.attempts
  set raw_score = v_raw_score,
      total_questions = v_total_questions,
      scored_at = now(),
      updated_at = now()
  where id = v_attempt.id;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'test_version_id', v_attempt.test_version_id,
    'raw_score', v_raw_score,
    'total_questions', v_total_questions
  );
end;
$$;

revoke all on function private.normalize_scoring_text(text, jsonb) from public;
revoke all on function private.normalize_scoring_group(jsonb, jsonb) from public;
revoke all on function private.scoring_max_words_exceeded(jsonb, jsonb) from public;
revoke all on function public.score_objective_attempt(uuid) from public;
grant execute on function public.score_objective_attempt(uuid) to authenticated;

comment on function public.score_objective_attempt(uuid) is
  'Scores a submitted objective attempt server-side against protected answer definitions and returns only score metadata.';
