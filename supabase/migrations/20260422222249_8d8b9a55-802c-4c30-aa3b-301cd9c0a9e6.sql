-- Withdrawal methods per user
CREATE TABLE public.withdrawal_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('mobile_money','bank','paypal')),
  label TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wm self select" ON public.withdrawal_methods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wm self insert" ON public.withdrawal_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wm self update" ON public.withdrawal_methods
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wm self delete" ON public.withdrawal_methods
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_wm_user ON public.withdrawal_methods(user_id);

-- Reusable updated_at trigger function (idempotent create)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_wm_updated
BEFORE UPDATE ON public.withdrawal_methods
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Optional reference on transactions
ALTER TABLE public.transactions
  ADD COLUMN method_id UUID REFERENCES public.withdrawal_methods(id) ON DELETE SET NULL;