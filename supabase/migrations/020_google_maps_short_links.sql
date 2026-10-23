begin;

-- Accept the Google Maps share-link host in the existing tour workflow.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.manage_record(text,jsonb)'::regprocedure);
  if position('maps[.]google[.]com|www[.]youtube[.]com' in definition)=0 then
    raise exception 'Tour URL validation not found. Apply migrations 001 through 019 first.';
  end if;
  execute replace(definition,
    'maps[.]google[.]com|www[.]youtube[.]com',
    'maps[.]google[.]com|maps[.]app[.]goo[.]gl|www[.]youtube[.]com');
end $$;

commit;
