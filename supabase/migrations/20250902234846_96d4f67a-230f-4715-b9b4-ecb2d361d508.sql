-- Add caused_dm field to social_media_comments table
ALTER TABLE public.social_media_comments 
ADD COLUMN caused_dm boolean DEFAULT false;