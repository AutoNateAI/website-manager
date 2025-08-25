-- Secure purchases table: enable RLS and restrict reads to authenticated users only

-- 1) Enable Row Level Security
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- 2) Create SELECT policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'purchases' 
      AND policyname = 'Authenticated users can view purchases'
  ) THEN
    CREATE POLICY "Authenticated users can view purchases"
    ON public.purchases
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;
