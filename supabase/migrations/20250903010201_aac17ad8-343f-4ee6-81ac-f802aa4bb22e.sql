-- Add caused_dm field to social_media_posts table to track which posts result in DMs
ALTER TABLE public.social_media_posts 
ADD COLUMN caused_dm boolean DEFAULT false;