begin;

alter table public.courses
  add column counselling_fee_min numeric(12,2),
  add column counselling_fee_max numeric(12,2),
  add column management_fee_min numeric(12,2),
  add column management_fee_max numeric(12,2),
  add column fee_period text not null default 'Per year';
alter table public.courses add constraint courses_counselling_fee_range check ((counselling_fee_min is null and counselling_fee_max is null) or (counselling_fee_min is not null and counselling_fee_max is not null and counselling_fee_min>=0 and counselling_fee_max>=counselling_fee_min and counselling_fee_max<=1000000000));
alter table public.courses add constraint courses_management_fee_range check ((management_fee_min is null and management_fee_max is null) or (management_fee_min is not null and management_fee_max is not null and management_fee_min>=0 and management_fee_max>=management_fee_min and management_fee_max<=1000000000));
alter table public.courses add constraint courses_fee_period_check check (fee_period in ('Per year','Per semester','Entire course'));

insert into public.course_categories(name,enabled) values
('Engineering',true),
('Arts & Science',true),
('Medicine',true),
('Management',true),
('Agriculture',true),
('Law',true),
('Commerce',true),
('Computer Applications',true),
('Architecture & Planning',true),
('Pharmacy',true),
('Nursing',true),
('Allied Health Sciences',true),
('Dentistry',true),
('Veterinary & Fisheries',true),
('Education',true),
('Design & Fine Arts',true),
('Media & Communication',true),
('Hospitality & Tourism',true),
('Other',true)
on conflict(name) do nothing;

-- Extend the existing authorized workflow without changing its other operations.
do $$
declare definition text; original text;
begin
  original := pg_get_functiondef('public.manage_record(text,jsonb)'::regprocedure);
  definition := original;
  if position('published_fee_amount=nullif(payload->>''published_fee_amount'','''')::numeric,description=' in definition)=0 then raise exception 'Course workflow not found; apply migrations 001 through 014 first.'; end if;
  definition := replace(definition,'published_fee_amount=nullif(payload->>''published_fee_amount'','''')::numeric,description=','published_fee_amount=coalesce(least(nullif(payload->>''counselling_fee_min'','''')::numeric,nullif(payload->>''management_fee_min'','''')::numeric),nullif(payload->>''published_fee_amount'','''')::numeric),counselling_fee_min=case when payload ? ''counselling_fee_min'' then nullif(payload->>''counselling_fee_min'','''')::numeric else counselling_fee_min end,counselling_fee_max=case when payload ? ''counselling_fee_max'' then nullif(payload->>''counselling_fee_max'','''')::numeric else counselling_fee_max end,management_fee_min=case when payload ? ''management_fee_min'' then nullif(payload->>''management_fee_min'','''')::numeric else management_fee_min end,management_fee_max=case when payload ? ''management_fee_max'' then nullif(payload->>''management_fee_max'','''')::numeric else management_fee_max end,fee_period=coalesce(nullif(payload->>''fee_period'',''''),fee_period),description=');
  if position('eligibility,published_fee_amount,description,is_published) values(i,' in definition)=0 then raise exception 'Course workflow not found; apply migrations 001 through 014 first.'; end if;
  definition := replace(definition,'eligibility,published_fee_amount,description,is_published) values(i,','eligibility,published_fee_amount,counselling_fee_min,counselling_fee_max,management_fee_min,management_fee_max,fee_period,description,is_published) values(i,');
  if position('nullif(payload->>''published_fee_amount'','''')::numeric,coalesce(payload->>''description'',''''),false)' in definition)=0 then raise exception 'Course workflow not found; apply migrations 001 through 014 first.'; end if;
  definition := replace(definition,'nullif(payload->>''published_fee_amount'','''')::numeric,coalesce(payload->>''description'',''''),false)','coalesce(least(nullif(payload->>''counselling_fee_min'','''')::numeric,nullif(payload->>''management_fee_min'','''')::numeric),nullif(payload->>''published_fee_amount'','''')::numeric),nullif(payload->>''counselling_fee_min'','''')::numeric,nullif(payload->>''counselling_fee_max'','''')::numeric,nullif(payload->>''management_fee_min'','''')::numeric,nullif(payload->>''management_fee_max'','''')::numeric,coalesce(nullif(payload->>''fee_period'',''''),''Per year''),coalesce(payload->>''description'',''''),false)');
  execute definition;
end $$;

commit;
