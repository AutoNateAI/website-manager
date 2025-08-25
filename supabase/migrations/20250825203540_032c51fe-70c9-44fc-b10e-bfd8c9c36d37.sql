-- Secure form_submissions: admin-only read, anonymous insert preserved

-- 1) Enable Row Level Security
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- 2) Ensure anonymous INSERT is allowed (if policy missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'form_submissions' 
      AND policyname = 'Anyone can submit forms'
  ) THEN
    CREATE POLICY "Anyone can submit forms"
    ON public.form_submissions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- 3) Create a SECURITY DEFINER function to check admin role via profiles
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.role = 'admin'
  );
$$;

-- 4) Admin-only SELECT policy (authenticated admins only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'form_submissions' 
      AND policyname = 'Admins can view form submissions'
  ) THEN
    CREATE POLICY "Admins can view form submissions"
    ON public.form_submissions
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;