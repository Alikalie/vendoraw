
create or replace function public.gen_referral_code() returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  loop
    code := 'VEN' || upper(substr(md5(random()::text),1,6));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end $$;
