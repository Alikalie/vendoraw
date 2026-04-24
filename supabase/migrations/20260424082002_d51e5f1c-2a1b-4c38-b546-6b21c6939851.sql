alter table public.transactions replica identity full;
alter publication supabase_realtime add table public.transactions;