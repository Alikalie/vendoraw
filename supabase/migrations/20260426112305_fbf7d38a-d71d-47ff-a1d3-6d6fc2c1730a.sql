-- Payment proofs storage bucket
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Storage RLS: users upload/read their own proofs (folder = user_id), admins read all
create policy "proofs self read"
on storage.objects for select
using (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "proofs self insert"
on storage.objects for insert
with check (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "proofs admin read"
on storage.objects for select
using (bucket_id = 'payment-proofs' and public.has_role(auth.uid(), 'admin'));

-- Profile additions: blocking, profile lock, currency lock, total_invested
alter table public.profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists profile_locked boolean not null default true,
  add column if not exists currency_locked_until timestamptz not null default (now() + interval '60 days'),
  add column if not exists total_invested numeric not null default 0,
  add column if not exists theme text not null default 'dark';

-- Transactions: payment proof + admin instructions/notes
alter table public.transactions
  add column if not exists proof_path text,
  add column if not exists notes text;

-- Support / Privacy CMS (admin-managed)
create table if not exists public.site_content (
  id text primary key,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.site_content enable row level security;

create policy "site_content public read"
on public.site_content for select using (true);

create policy "site_content admin write"
on public.site_content for all
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

insert into public.site_content (id, title, body) values
  ('support', 'Help & Support', 'Contact support@vendora.app for any issue. Admin will reply within 24h.'),
  ('privacy', 'Privacy & Terms', 'Vendora is an educational simulation. We store only the data necessary to operate your wallet.')
on conflict (id) do nothing;
