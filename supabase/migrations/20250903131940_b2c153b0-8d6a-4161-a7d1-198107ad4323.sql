-- Add post_url field to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN post_url text;