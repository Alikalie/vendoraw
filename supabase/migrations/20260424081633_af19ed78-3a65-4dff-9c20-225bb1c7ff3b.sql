-- 1. Role enum
create type public.app_role as enum ('admin', 'user');

-- 2. user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 3. Security-definer role check
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- 4. Policies on user_roles
create policy "users read own roles" on public.user_roles
  for select using (auth.uid() = user_id);

create policy "admins read all roles" on public.user_roles
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "admins manage roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 5. Admin-visibility policies on existing tables
create policy "admins read all transactions" on public.transactions
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "admins update transactions" on public.transactions
  for update using (public.has_role(auth.uid(), 'admin'));

create policy "admins read all profiles" on public.profiles
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "admins update profiles" on public.profiles
  for update using (public.has_role(auth.uid(), 'admin'));

create policy "admins read all withdrawal methods" on public.withdrawal_methods
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "admins read all investments" on public.investments
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "admins read all resale" on public.resale_listings
  for select using (public.has_role(auth.uid(), 'admin'));

-- 6. Grant admin to current logged-in user (you)
-- Find the most recently active user — adjust if needed
insert into public.user_roles (user_id, role)
select id, 'admin'::app_role
from auth.users
order by last_sign_in_at desc nulls last, created_at desc
limit 1
on conflict do nothing;