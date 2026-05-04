-- Add image and earning frequency to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS earning_frequency TEXT NOT NULL DEFAULT 'daily';

-- Constrain earning_frequency
DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_earning_frequency_check
    CHECK (earning_frequency IN ('daily','weekly','monthly'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Migrate any 'high' risk to 'medium' so app no longer needs that tier
UPDATE public.products SET risk_level = 'medium' WHERE risk_level = 'high';

-- Public storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('product-images','product-images', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  CREATE POLICY "product images public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "product images admin write" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'product-images'
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "product images admin update" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'product-images'
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "product images admin delete" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'product-images'
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;