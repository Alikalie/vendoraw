
-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- NULL = broadcast
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'info', -- info, success, warning, system
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications self read" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "notifications self update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications admin all" ON public.notifications
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============ NEWS ============
CREATE TABLE IF NOT EXISTS public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text,
  pinned boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news public read" ON public.news_posts FOR SELECT USING (published = true);
CREATE POLICY "news admin all" ON public.news_posts
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER news_posts_set_updated BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REFERRAL APPLICATIONS ============
CREATE TABLE IF NOT EXISTS public.referral_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  desired_code text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  account_id text NOT NULL,
  payout_account text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewer_id uuid,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ra_user_idx ON public.referral_applications(user_id);
ALTER TABLE public.referral_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ra self read" ON public.referral_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ra self insert" ON public.referral_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ra admin all" ON public.referral_applications
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============ PROFILES: allow nullable referral_code (issued upon approval) ============
ALTER TABLE public.profiles ALTER COLUMN referral_code DROP NOT NULL;

-- ============ PRODUCTS: add earning_frequency choices already exist; remove risk concept by hiding in UI ============
-- (No schema change required)

-- ============ HANDLE NEW USER: no auto referral code; create welcome notification ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ref_by uuid;
  signup_bonus numeric := 5;
begin
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
    NULL,  -- no auto-generated code; user must apply
    ref_by,
    case when ref_by is not null then signup_bonus else 0 end
  );

  if ref_by is not null then
    insert into public.transactions (user_id, type, amount, currency, description)
    values (new.id, 'referral', signup_bonus, coalesce(new.raw_user_meta_data->>'currency','USD'), 'Sign-up referral bonus');
  end if;

  -- Welcome notification
  insert into public.notifications(user_id, title, body, kind)
  values (
    new.id,
    'Welcome to Vendora 🎉',
    'Your account is ready. Make your first deposit to start earning, and explore the marketplace.',
    'success'
  );

  return new;
end $function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ APPROVE REFERRAL APPLICATION (admin) ============
CREATE OR REPLACE FUNCTION public.approve_referral_application(_app_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  app_row public.referral_applications%ROWTYPE;
  taken int;
  completed_count int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO app_row FROM public.referral_applications WHERE id = _app_id;
  IF app_row IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF app_row.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;

  -- Verify rule: 10 distinct completed investments
  SELECT count(*) INTO completed_count
    FROM public.investments WHERE user_id = app_row.user_id AND status = 'completed';
  IF completed_count < 10 THEN
    RAISE EXCEPTION 'User has only % completed investments, requires 10', completed_count;
  END IF;

  -- Make sure code not taken
  SELECT count(*) INTO taken FROM public.profiles WHERE upper(referral_code) = upper(app_row.desired_code);
  IF taken > 0 THEN RAISE EXCEPTION 'Referral code already taken'; END IF;

  UPDATE public.profiles SET referral_code = upper(app_row.desired_code) WHERE id = app_row.user_id;
  UPDATE public.referral_applications
    SET status = 'approved', reviewer_id = auth.uid(), reviewed_at = now()
   WHERE id = _app_id;

  INSERT INTO public.notifications(user_id, title, body, kind)
  VALUES (app_row.user_id, 'Referral code approved ✅',
          'Your referral code "' || upper(app_row.desired_code) || '" is now active. Share it to earn commissions.', 'success');

  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.reject_referral_application(_app_id uuid, _reason text DEFAULT '')
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE app_row public.referral_applications%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO app_row FROM public.referral_applications WHERE id = _app_id;
  IF app_row IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;

  UPDATE public.referral_applications
    SET status = 'rejected', reviewer_id = auth.uid(), reviewed_at = now(),
        reject_reason = coalesce(_reason, '')
   WHERE id = _app_id;

  INSERT INTO public.notifications(user_id, title, body, kind)
  VALUES (app_row.user_id, 'Referral application rejected',
          coalesce(_reason, 'Your application was rejected.'), 'warning');

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.approve_referral_application(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_referral_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_referral_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_referral_application(uuid, text) TO authenticated;
