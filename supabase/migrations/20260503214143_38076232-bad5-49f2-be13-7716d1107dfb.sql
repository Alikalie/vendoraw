
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS earnings_paid_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS last_earning_at timestamptz;

CREATE OR REPLACE FUNCTION public.process_daily_earnings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  paid_count int := 0;
  total_credit numeric := 0;
BEGIN
  FOR inv IN
    SELECT * FROM public.investments
    WHERE status = 'active'
      AND earnings_paid_count < duration_days
      AND (last_earning_at IS NULL OR last_earning_at < (now() - interval '20 hours'))
  LOOP
    UPDATE public.profiles
       SET balance = balance + inv.daily_earning,
           total_earned = total_earned + inv.daily_earning
     WHERE id = inv.user_id;

    INSERT INTO public.transactions(user_id, type, amount, currency, status, description)
    SELECT inv.user_id, 'earning', inv.daily_earning, p.currency, 'completed',
           'Daily earning from investment'
      FROM public.profiles p WHERE p.id = inv.user_id;

    UPDATE public.investments
       SET earnings_paid_count = earnings_paid_count + 1,
           earnings_accrued = earnings_accrued + inv.daily_earning,
           last_earning_at = now(),
           status = CASE WHEN earnings_paid_count + 1 >= duration_days THEN 'completed' ELSE 'active' END
     WHERE id = inv.id;

    paid_count := paid_count + 1;
    total_credit := total_credit + inv.daily_earning;
  END LOOP;

  RETURN jsonb_build_object('paid', paid_count, 'credited', total_credit, 'at', now());
END
$$;

REVOKE EXECUTE ON FUNCTION public.process_daily_earnings() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_daily_earnings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_daily_earnings() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_daily_earnings() TO service_role;

REVOKE EXECUTE ON FUNCTION public.gen_referral_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.gen_referral_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM anon;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'process-daily-earnings';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END$$;

SELECT cron.schedule(
  'process-daily-earnings',
  '5 0 * * *',
  $$ SELECT public.process_daily_earnings(); $$
);

CREATE OR REPLACE VIEW public.auth_login_history AS
SELECT
  id,
  NULLIF(payload->>'actor_id','')::uuid AS user_id,
  NULLIF(payload->>'actor_username','') AS actor_email,
  ip_address,
  created_at,
  payload->>'action' AS action,
  payload
FROM auth.audit_log_entries
WHERE payload->>'action' IN ('login','logout','token_refreshed','user_signedup','user_invited');

REVOKE ALL ON public.auth_login_history FROM PUBLIC;
REVOKE ALL ON public.auth_login_history FROM anon;
REVOKE ALL ON public.auth_login_history FROM authenticated;
GRANT SELECT ON public.auth_login_history TO service_role;

DROP POLICY IF EXISTS "audit admin read" ON public.admin_audit_log;
CREATE POLICY "audit admin read" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
