begin;

alter table public.profiles
  add column year_passed integer check (year_passed between 1950 and 2100),
  add column marks numeric check (marks >= 0 and marks <= 10000),
  add column cutoff numeric check (cutoff >= 0 and cutoff <= 10000),
  add column parent_phone text not null default '',
  add column student_profile_completed_at timestamptz;

create function public.save_student_details(payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare
  student uuid := auth.uid();
  passed integer := nullif(payload->>'year_passed','')::integer;
  score numeric := nullif(payload->>'marks','')::numeric;
  cutoff_score numeric := nullif(payload->>'cutoff','')::numeric;
begin
  if student is null or not exists(select 1 from public.profiles where id=student and role='student') then
    raise exception 'A student account is required.';
  end if;
  if length(trim(coalesce(payload->>'full_name',''))) not between 2 and 120
    or passed is null or passed not between 1950 and extract(year from current_date)::integer
    or score is null or score < 0 or score > 10000
    or (cutoff_score is not null and (cutoff_score < 0 or cutoff_score > 10000))
    or coalesce(payload->>'phone','') !~ '^\+?[0-9 ()-]{7,30}$'
    or coalesce(payload->>'parent_phone','') !~ '^\+?[0-9 ()-]{7,30}$'
    or length(regexp_replace(coalesce(payload->>'phone',''),'[^0-9]','','g')) < 7
    or length(regexp_replace(coalesce(payload->>'parent_phone',''),'[^0-9]','','g')) < 7 then
    raise exception 'Enter a valid name, passing year, marks, mobile number and parent number.';
  end if;
  perform public.throttle('student-details:'||student,30,3600);
  update public.profiles set
    full_name=trim(payload->>'full_name'), phone=trim(payload->>'phone'),
    year_passed=passed, marks=score, cutoff=cutoff_score,
    parent_phone=trim(payload->>'parent_phone'),
    student_profile_completed_at=coalesce(student_profile_completed_at,now()), updated_at=now()
  where id=student;
end $$;

revoke all on function public.save_student_details(jsonb) from public,anon;
grant execute on function public.save_student_details(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
