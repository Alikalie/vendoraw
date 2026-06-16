
-- 1. Payment accounts (admin-managed deposit destinations)
CREATE TABLE public.payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'bank',
  currency text NOT NULL DEFAULT 'USD',
  instructions text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_accounts TO anon, authenticated;
GRANT ALL ON public.payment_accounts TO service_role, authenticated;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active payment accounts" ON public.payment_accounts
  FOR SELECT USING (active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins manage payment accounts" ON public.payment_accounts
  FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_payment_accounts_updated BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. App settings defaults for new affiliate rules + payout
INSERT INTO public.app_settings(key,value) VALUES
  ('affiliate_signup_direct_usd', '0.25'::jsonb),
  ('affiliate_signup_subaffiliate_usd', '0.15'::jsonb),
  ('affiliate_payout_min_usd', '25'::jsonb),
  ('affiliate_payout_weekday', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Lock user self-update of contact/country/currency (admin still has admin policy)
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;
CREATE OR REPLACE FUNCTION public.profiles_self_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify another user profile';
  END IF;
  -- enforce immutability of locked / financial / identity fields for self-update
  NEW.balance := OLD.balance;
  NEW.total_earned := OLD.total_earned;
  NEW.total_withdrawn := OLD.total_withdrawn;
  NEW.total_invested := OLD.total_invested;
  NEW.is_blocked := OLD.is_blocked;
  NEW.profile_locked := OLD.profile_locked;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  NEW.country := OLD.country;
  NEW.country_code := OLD.country_code;
  NEW.contact := OLD.contact;
  IF OLD.currency_locked_until > now() THEN
    NEW.currency := OLD.currency;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_profiles_self_update_guard ON public.profiles;
CREATE TRIGGER trg_profiles_self_update_guard BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_self_update_guard();
CREATE POLICY "profiles self update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Two-tier signup bonus on handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  ref_by uuid;
  ref_l2 uuid;
  bonus_direct numeric := 0.25;
  bonus_sub numeric := 0.15;
  v_aff_currency text;
  v_l2_currency text;
begin
  SELECT (value::text)::numeric INTO bonus_direct FROM public.app_settings WHERE key='affiliate_signup_direct_usd';
  SELECT (value::text)::numeric INTO bonus_sub FROM public.app_settings WHERE key='affiliate_signup_subaffiliate_usd';
  bonus_direct := coalesce(bonus_direct, 0.25);
  bonus_sub := coalesce(bonus_sub, 0.15);

  if new.raw_user_meta_data ? 'referral_code' and length(coalesce(new.raw_user_meta_data->>'referral_code','')) > 0 then
    select id, referred_by into ref_by, ref_l2 from public.profiles
      where upper(referral_code) = upper(new.raw_user_meta_data->>'referral_code');
  end if;

  insert into public.profiles (id, first_name, last_name, country, country_code, currency, contact, email, referred_by, balance, profile_locked)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name',''),
    coalesce(new.raw_user_meta_data->>'last_name',''),
    coalesce(new.raw_user_meta_data->>'country',''),
    coalesce(new.raw_user_meta_data->>'country_code',''),
    coalesce(new.raw_user_meta_data->>'currency','USD'),
    coalesce(new.raw_user_meta_data->>'contact',''),
    new.email,
    ref_by,
    0,
    true
  );

  -- Tier 1 ($0.25)
  if ref_by is not null and bonus_direct > 0 then
    SELECT currency INTO v_aff_currency FROM public.profiles WHERE id = ref_by;
    UPDATE public.profiles SET balance = balance + bonus_direct, total_earned = total_earned + bonus_direct WHERE id = ref_by;
    INSERT INTO public.transactions(user_id,type,amount,currency,status,description)
      VALUES(ref_by,'referral',bonus_direct,coalesce(v_aff_currency,'USD'),'completed','Direct signup bonus');
    INSERT INTO public.notifications(user_id,title,body,kind)
      VALUES(ref_by,'Affiliate signup 🎉',
        'A new user signed up with your code. +$' || bonus_direct::text || ' added to your balance.','success');
  end if;

  -- Tier 2 ($0.15) - the affiliate's own affiliate
  if ref_l2 is not null and ref_l2 <> ref_by and bonus_sub > 0 then
    SELECT currency INTO v_l2_currency FROM public.profiles WHERE id = ref_l2;
    UPDATE public.profiles SET balance = balance + bonus_sub, total_earned = total_earned + bonus_sub WHERE id = ref_l2;
    INSERT INTO public.transactions(user_id,type,amount,currency,status,description)
      VALUES(ref_l2,'referral',bonus_sub,coalesce(v_l2_currency,'USD'),'completed','Sub-affiliate signup bonus');
    INSERT INTO public.notifications(user_id,title,body,kind)
      VALUES(ref_l2,'Sub-affiliate signup',
        'A sub-affiliate referral signed up. +$' || bonus_sub::text || ' added to your balance.','success');
  end if;

  insert into public.notifications(user_id,title,body,kind)
  values (new.id,'Welcome to Vendora 🎉',
    'Your account is ready. Make your first deposit to start earning.','success');

  return new;
end $$;

-- 5. Affiliate payout request RPC: enforce Monday + $25 USD minimum
CREATE OR REPLACE FUNCTION public.request_affiliate_payout(_amount numeric, _method_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prof public.profiles%ROWTYPE;
  v_min numeric;
  v_day int;
  v_today int;
  v_method_label text := 'Affiliate payout';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = auth.uid();
  IF v_prof IS NULL THEN RAISE EXCEPTION 'Profile missing'; END IF;
  IF v_prof.is_blocked THEN RAISE EXCEPTION 'Account blocked'; END IF;
  IF v_prof.referral_code IS NULL THEN RAISE EXCEPTION 'Not an approved affiliate'; END IF;

  SELECT (value::text)::numeric INTO v_min FROM public.app_settings WHERE key='affiliate_payout_min_usd';
  SELECT (value::text)::int INTO v_day FROM public.app_settings WHERE key='affiliate_payout_weekday';
  v_min := coalesce(v_min, 25); v_day := coalesce(v_day, 1);
  v_today := EXTRACT(ISODOW FROM (now() AT TIME ZONE 'UTC'));

  IF v_today <> v_day THEN
    RAISE EXCEPTION 'Affiliate payouts are only available on Mondays (UTC)';
  END IF;
  IF _amount < v_min THEN
    RAISE EXCEPTION 'Minimum payout is $%', v_min;
  END IF;
  IF _amount > v_prof.balance THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  IF _method_id IS NOT NULL THEN
    SELECT label INTO v_method_label FROM public.withdrawal_methods
      WHERE id = _method_id AND user_id = auth.uid();
  END IF;

  INSERT INTO public.transactions(user_id,type,amount,currency,status,description,method_id)
    VALUES(auth.uid(),'withdraw',_amount,v_prof.currency,'pending',
      'Affiliate payout request - ' || coalesce(v_method_label,'Manual'), _method_id);

  RETURN jsonb_build_object('ok', true);
END $$;
GRANT EXECUTE ON FUNCTION public.request_affiliate_payout(numeric, uuid) TO authenticated;

-- 6. Admin commission adjustment RPC
CREATE OR REPLACE FUNCTION public.admin_adjust_referral_commission(_user_id uuid, _amount numeric, _note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cur text; v_new numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT currency, balance + _amount INTO v_cur, v_new FROM public.profiles WHERE id = _user_id;
  IF v_cur IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_new < 0 THEN RAISE EXCEPTION 'Balance would go negative'; END IF;

  UPDATE public.profiles SET
    balance = balance + _amount,
    total_earned = total_earned + CASE WHEN _amount > 0 THEN _amount ELSE 0 END
  WHERE id = _user_id;
  INSERT INTO public.transactions(user_id,type,amount,currency,status,description)
    VALUES(_user_id,'referral',abs(_amount),v_cur,'completed',
      CASE WHEN _amount >= 0 THEN 'Admin commission credit' ELSE 'Admin commission debit' END
      || CASE WHEN coalesce(_note,'')<>'' THEN ' — ' || _note ELSE '' END);
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,metadata)
    VALUES(auth.uid(),'adjust_referral','user',_user_id::text, jsonb_build_object('amount',_amount,'note',_note));
  RETURN jsonb_build_object('ok',true);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_adjust_referral_commission(uuid,numeric,text) TO authenticated;
