-- Create admin profile for the current authenticated user
-- This will allow campaign creation to work
INSERT INTO public.profiles (user_id, username, role)
SELECT auth.uid(), 'admin', 'admin'
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid()
  );