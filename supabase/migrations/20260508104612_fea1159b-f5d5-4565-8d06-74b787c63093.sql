
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('affiliate_commission_rate', '0.05'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS transactions_user_type_idx ON public.transactions(user_id, type);
