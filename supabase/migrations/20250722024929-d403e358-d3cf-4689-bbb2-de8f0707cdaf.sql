-- Create auth profiles table for the admin user
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Authenticated users can read their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create blog_ads junction table to link blogs with ads
CREATE TABLE public.blog_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  position_after_heading INTEGER NOT NULL, -- Which heading number to show after
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blog_id, advertisement_id, position_after_heading)
);

-- Enable RLS on blog_ads
ALTER TABLE public.blog_ads ENABLE ROW LEVEL SECURITY;

-- Create policies for blog_ads
CREATE POLICY "Authenticated users can view blog ads" 
ON public.blog_ads 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage blog ads" 
ON public.blog_ads 
FOR ALL 
USING (true);

-- Update RLS policies for blogs to allow admin operations
DROP POLICY IF EXISTS "Anyone can read published blogs" ON public.blogs;

CREATE POLICY "Anyone can read published blogs" 
ON public.blogs 
FOR SELECT 
USING (published = true);

CREATE POLICY "Authenticated users can manage blogs" 
ON public.blogs 
FOR ALL 
USING (true);

-- Update RLS policies for advertisements to allow admin operations  
DROP POLICY IF EXISTS "Anyone can view active advertisements" ON public.advertisements;

CREATE POLICY "Anyone can view active advertisements" 
ON public.advertisements 
FOR SELECT 
USING ((is_active = true) AND ((start_date IS NULL) OR (start_date <= now())) AND ((end_date IS NULL) OR (end_date >= now())));

CREATE POLICY "Authenticated users can manage advertisements" 
ON public.advertisements 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles timestamps
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for blogs timestamps  
CREATE TRIGGER update_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();