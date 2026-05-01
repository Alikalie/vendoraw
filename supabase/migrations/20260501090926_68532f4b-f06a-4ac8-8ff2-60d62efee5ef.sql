
-- Set explicit search_path for any function missing it
ALTER FUNCTION public.touch_app_settings() SET search_path = public;

-- Revoke broad EXECUTE on internal helpers; keep what each actually needs
-- has_role: used inside RLS policies as the calling user — needs authenticated to execute
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- gen_referral_code: only used by handle_new_user trigger. No client should call it.
REVOKE EXECUTE ON FUNCTION public.gen_referral_code() FROM PUBLIC, anon, authenticated;

-- handle_new_user: trigger only.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- set_updated_at: trigger only.
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- touch_app_settings: trigger only.
REVOKE EXECUTE ON FUNCTION public.touch_app_settings() FROM PUBLIC, anon, authenticated;
