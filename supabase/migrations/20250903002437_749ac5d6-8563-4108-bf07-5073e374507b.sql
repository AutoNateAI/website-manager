-- Create instagram_accounts table for tracking connected accounts
CREATE TABLE public.instagram_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  profile_picture_url TEXT,
  follower_count INTEGER,
  following_count INTEGER,
  bio TEXT,
  is_connected BOOLEAN DEFAULT false,
  access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_posts table for tracking post scheduling
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  social_media_post_id UUID REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'posted', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  payload JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add fields to social_media_posts for tracking assigned accounts and status
ALTER TABLE public.social_media_posts 
ADD COLUMN assigned_account_id UUID REFERENCES public.instagram_accounts(id),
ADD COLUMN post_status TEXT DEFAULT 'draft' CHECK (post_status IN ('draft', 'assigned', 'scheduled', 'posted', 'failed')),
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN posted_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for instagram_accounts
CREATE POLICY "Admin only access to instagram accounts" 
ON public.instagram_accounts 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create policies for scheduled_posts
CREATE POLICY "Admin only access to scheduled posts" 
ON public.scheduled_posts 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_instagram_accounts_updated_at
BEFORE UPDATE ON public.instagram_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at
BEFORE UPDATE ON public.scheduled_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();