-- Fix the foreign key to point to instagram_users instead of instagram_accounts
ALTER TABLE public.social_media_posts 
DROP COLUMN IF EXISTS assigned_account_id;

ALTER TABLE public.social_media_posts 
ADD COLUMN assigned_user_id UUID REFERENCES public.instagram_users(id);