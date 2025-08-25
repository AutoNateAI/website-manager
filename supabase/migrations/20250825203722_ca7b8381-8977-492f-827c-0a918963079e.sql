-- Harden read access for customer contact tables: admin-only reads, keep public inserts

-- Ensure helper function exists (idempotent)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.role = 'admin'
  );
$$;

-- 1) coaching_requests
ALTER TABLE public.coaching_requests ENABLE ROW LEVEL SECURITY;

-- Drop broad SELECT policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'coaching_requests' 
      AND policyname = 'Authenticated users can view coaching requests'
  ) THEN
    DROP POLICY "Authenticated users can view coaching requests" ON public.coaching_requests;
  END IF;
END $$;

-- Create admin-only SELECT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'coaching_requests' 
      AND policyname = 'Admins can view coaching requests'
  ) THEN
    CREATE POLICY "Admins can view coaching requests"
    ON public.coaching_requests
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Preserve/ensure public INSERT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'coaching_requests' 
      AND policyname = 'Anyone can submit coaching requests'
  ) THEN
    CREATE POLICY "Anyone can submit coaching requests"
    ON public.coaching_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- 2) workshop_requests
ALTER TABLE public.workshop_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'workshop_requests' 
      AND policyname = 'Authenticated users can view workshop requests'
  ) THEN
    DROP POLICY "Authenticated users can view workshop requests" ON public.workshop_requests;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'workshop_requests' 
      AND policyname = 'Admins can view workshop requests'
  ) THEN
    CREATE POLICY "Admins can view workshop requests"
    ON public.workshop_requests
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'workshop_requests' 
      AND policyname = 'Anyone can submit workshop requests'
  ) THEN
    CREATE POLICY "Anyone can submit workshop requests"
    ON public.workshop_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- 3) contact_inquiries
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'contact_inquiries' 
      AND policyname = 'Authenticated users can view contact inquiries'
  ) THEN
    DROP POLICY "Authenticated users can view contact inquiries" ON public.contact_inquiries;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'contact_inquiries' 
      AND policyname = 'Admins can view contact inquiries'
  ) THEN
    CREATE POLICY "Admins can view contact inquiries"
    ON public.contact_inquiries
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'contact_inquiries' 
      AND policyname = 'Anyone can submit contact inquiries'
  ) THEN
    CREATE POLICY "Anyone can submit contact inquiries"
    ON public.contact_inquiries
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;