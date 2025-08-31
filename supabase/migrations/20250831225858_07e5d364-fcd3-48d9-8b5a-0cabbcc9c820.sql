-- Add media_type column to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN media_type text DEFAULT 'evergreen'::text;

-- Add a comment to describe the media types
COMMENT ON COLUMN public.social_media_posts.media_type IS 'Type of content: company (teaching companies about command centers), evergreen (educational community content), advertisement (sales-focused product content)';