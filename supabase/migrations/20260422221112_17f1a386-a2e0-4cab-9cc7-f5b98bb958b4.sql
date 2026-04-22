
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  country text not null,
  country_code text not null,
  currency text not null default 'USD',
  contact text,
  email text,
  balance numeric(14,2) not null default 0,
  total_earned numeric(14,2) not null default 0,
  total_withdrawn numeric(14,2) not null default 0,
  referral_code text not null unique,
  referred_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles self select" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(14,2) not null,
  daily_earning numeric(14,2) not null,
  duration_days int not null,
  total_return numeric(14,2) not null,
  risk_level text not null default 'low',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "products public read" on public.products for select using (true);

-- INVESTMENTS
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  purchase_price numeric(14,2) not null,
  daily_earning numeric(14,2) not null,
  duration_days int not null,
  total_return numeric(14,2) not null,
  earnings_accrued numeric(14,2) not null default 0,
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.investments enable row level security;
create policy "investments self read" on public.investments for select using (auth.uid() = user_id);
create policy "investments self insert" on public.investments for insert with check (auth.uid() = user_id);
create policy "investments self update" on public.investments for update using (auth.uid() = user_id);

-- TRANSACTIONS
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- deposit | withdraw | buy | earning | referral | resale_buy | resale_sell
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  status text not null default 'completed',
  description text,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "transactions self read" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions self insert" on public.transactions for insert with check (auth.uid() = user_id);

-- RESALE LISTINGS
create table public.resale_listings (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  price numeric(14,2) not null,
  status text not null default 'open', -- open | sold | cancelled
  buyer_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  sold_at timestamptz
);
alter table public.resale_listings enable row level security;
create policy "resale public read" on public.resale_listings for select using (true);
create policy "resale seller insert" on public.resale_listings for insert with check (auth.uid() = seller_id);
create policy "resale seller update" on public.resale_listings for update using (auth.uid() = seller_id or auth.uid() = buyer_id);

-- Helper: gen ref code
create or replace function public.gen_referral_code() returns text language plpgsql as $$
declare code text;
begin
  loop
    code := 'VEN' || upper(substr(md5(random()::text),1,6));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end $$;

-- Trigger on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ref_code text;
  ref_by uuid;
  signup_bonus numeric := 5;
begin
  ref_code := public.gen_referral_code();
  if new.raw_user_meta_data ? 'referral_code' and length(coalesce(new.raw_user_meta_data->>'referral_code','')) > 0 then
    select id into ref_by from public.profiles where referral_code = new.raw_user_meta_data->>'referral_code';
  end if;

  insert into public.profiles (id, first_name, last_name, country, country_code, currency, contact, email, referral_code, referred_by, balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name',''),
    coalesce(new.raw_user_meta_data->>'last_name',''),
    coalesce(new.raw_user_meta_data->>'country',''),
    coalesce(new.raw_user_meta_data->>'country_code',''),
    coalesce(new.raw_user_meta_data->>'currency','USD'),
    coalesce(new.raw_user_meta_data->>'contact',''),
    new.email,
    ref_code,
    ref_by,
    case when ref_by is not null then signup_bonus else 0 end
  );

  if ref_by is not null then
    insert into public.transactions (user_id, type, amount, currency, description)
    values (new.id, 'referral', signup_bonus, coalesce(new.raw_user_meta_data->>'currency','USD'), 'Sign-up referral bonus');
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed products
insert into public.products (name, description, price, daily_earning, duration_days, total_return, risk_level) values
('Starter Pack', 'Entry-level simulated product', 50, 3, 10, 80, 'low'),
('Bronze Bundle', 'Steady simulated returns', 100, 6, 15, 190, 'low'),
('Silver Bundle', 'Mid-tier simulated product', 250, 14, 20, 530, 'medium'),
('Gold Bundle', 'Higher simulated yield', 500, 28, 25, 1200, 'medium'),
('Platinum Pack', 'Long-circle simulated product', 1000, 50, 30, 2500, 'high'),
('Vendora Elite', 'Premium simulated bundle', 2500, 130, 30, 6400, 'high');
