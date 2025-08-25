-- Add context_direction column to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN context_direction TEXT;