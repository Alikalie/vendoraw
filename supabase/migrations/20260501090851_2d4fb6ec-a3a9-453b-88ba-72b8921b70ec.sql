
-- ============== app_settings ==============
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings public read" ON public.app_settings
  FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.app_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('referral_bonus_usd', '5'::jsonb),
  ('commission_percent', '10'::jsonb),
  ('base_currency', '"USD"'::jsonb),
  ('min_withdrawal_usd', '5'::jsonb),
  ('min_deposit_usd', '1'::jsonb),
  ('earnings_paused', 'false'::jsonb),
  ('signups_disabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============== exchange_rates ==============
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  currency text PRIMARY KEY,
  rate numeric NOT NULL, -- units of currency per 1 USD
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fx public read" ON public.exchange_rates FOR SELECT USING (true);
CREATE POLICY "fx admin write" ON public.exchange_rates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.exchange_rates (currency, rate) VALUES
  ('USD', 1), ('EUR', 0.92), ('GBP', 0.79), ('NGN', 1600), ('GHS', 15),
  ('KES', 130), ('ZAR', 18), ('INR', 83), ('CAD', 1.36), ('AUD', 1.52),
  ('JPY', 155), ('CNY', 7.2), ('BRL', 5.1), ('MXN', 17.2), ('EGP', 49),
  ('SLE', 22.5), ('XOF', 605), ('XAF', 605), ('GMD', 70), ('LRD', 190),
  ('SGD', 1.34), ('HKD', 7.8), ('TZS', 2600), ('UGX', 3700), ('RWF', 1300),
  ('ETB', 56), ('MAD', 10), ('TND', 3.1), ('DZD', 134), ('ZMW', 26),
  ('MWK', 1700), ('MZN', 64), ('AED', 3.67), ('SAR', 3.75), ('QAR', 3.64),
  ('TRY', 32), ('CHF', 0.88), ('SEK', 10.5), ('NOK', 10.7), ('DKK', 6.85)
ON CONFLICT (currency) DO NOTHING;

-- ============== admin_audit_log ==============
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit super read" ON public.admin_audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "audit admin insert" ON public.admin_audit_log
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND auth.uid() = actor_id
  );

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON public.admin_audit_log (created_at DESC);

-- Helper function (auditable from anywhere) — security definer so it bypasses
-- RLS but only writes if caller is actually an admin.
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _target_type text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF NOT (public.has_role(auth.uid(), 'admin')
       OR public.has_role(auth.uid(), 'super_admin')) THEN
    RETURN;
  END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb));
END
$$;

-- updated_at trigger for app_settings
CREATE OR REPLACE FUNCTION public.touch_app_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS app_settings_touch ON public.app_settings;
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_app_settings();
