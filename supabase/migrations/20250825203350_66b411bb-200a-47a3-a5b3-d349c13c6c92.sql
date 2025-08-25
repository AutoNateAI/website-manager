-- Harden purchases table RLS: only the purchasing user can read their own rows

-- 1) Ensure user_id exists for per-user scoping
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS user_id uuid; -- intentionally no FK to auth.users per project guidelines

-- 2) Enable RLS (idempotent)
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- 3) Remove previously broad SELECT policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'purchases' 
      AND policyname = 'Authenticated users can view purchases'
  ) THEN
    DROP POLICY "Authenticated users can view purchases" ON public.purchases;
  END IF;
END $$;

-- 4) Create strict SELECT policy (only own rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'purchases' 
      AND policyname = 'Users can view their own purchases'
  ) THEN
    CREATE POLICY "Users can view their own purchases"
    ON public.purchases
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- 5) Allow authenticated users to INSERT, but only for themselves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'purchases' 
      AND policyname = 'Users can insert their own purchases'
  ) THEN
    CREATE POLICY "Users can insert their own purchases"
    ON public.purchases
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
  END IF;
END $$;

-- 6) Trigger to auto-populate user_id from auth if missing, keeping client code simple
CREATE OR REPLACE FUNCTION public.set_purchase_user_id_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_purchase_user_id ON public.purchases;
CREATE TRIGGER trg_set_purchase_user_id
BEFORE INSERT ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.set_purchase_user_id_from_auth();

-- 7) Helpful index for lookups by user
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
