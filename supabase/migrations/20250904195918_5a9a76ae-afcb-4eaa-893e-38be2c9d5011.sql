-- Add company and person connections to Instagram users
ALTER TABLE public.instagram_users 
ADD COLUMN company_id uuid REFERENCES public.companies(id),
ADD COLUMN person_id uuid REFERENCES public.people(id);

-- Add indexes for better performance
CREATE INDEX idx_instagram_users_company_id ON public.instagram_users(company_id);
CREATE INDEX idx_instagram_users_person_id ON public.instagram_users(person_id);

-- Create or update function to automatically create Instagram users from comments
CREATE OR REPLACE FUNCTION public.create_or_get_instagram_user(
  username_param text,
  display_name_param text DEFAULT NULL,
  bio_param text DEFAULT NULL,
  location_param text DEFAULT NULL,
  discovered_through_param text DEFAULT 'comment',
  company_id_param uuid DEFAULT NULL,
  person_id_param uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  clean_username text;
BEGIN
  -- Clean the username (remove @ symbol if present)
  clean_username := TRIM(LEADING '@' FROM TRIM(username_param));
  
  -- Check if user already exists (case insensitive)
  SELECT id INTO user_id 
  FROM public.instagram_users 
  WHERE LOWER(username) = LOWER(clean_username)
  LIMIT 1;
  
  -- If user doesn't exist, create them
  IF user_id IS NULL THEN
    INSERT INTO public.instagram_users (
      username,
      display_name,
      bio,
      location,
      discovered_through,
      company_id,
      person_id,
      created_at,
      updated_at
    ) VALUES (
      clean_username,
      COALESCE(display_name_param, clean_username),
      bio_param,
      location_param,
      discovered_through_param,
      company_id_param,
      person_id_param,
      now(),
      now()
    )
    RETURNING id INTO user_id;
  ELSE
    -- Update existing user with additional info if provided and currently empty
    UPDATE public.instagram_users 
    SET 
      display_name = COALESCE(NULLIF(display_name, ''), display_name_param, display_name),
      bio = COALESCE(NULLIF(bio, ''), bio_param, bio),
      location = COALESCE(NULLIF(location, ''), location_param, location),
      company_id = COALESCE(company_id, company_id_param),
      person_id = COALESCE(person_id, person_id_param),
      updated_at = now()
    WHERE id = user_id;
  END IF;
  
  RETURN user_id;
END;
$$;