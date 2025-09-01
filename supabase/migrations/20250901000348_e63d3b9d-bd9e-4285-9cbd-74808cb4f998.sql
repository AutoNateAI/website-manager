-- Add media_type and status fields to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN media_type text DEFAULT 'evergreen'::text,
ADD COLUMN status text DEFAULT 'pending'::text,
ADD COLUMN generation_progress jsonb DEFAULT '{}'::jsonb;

-- Create an index for better performance on status queries
CREATE INDEX idx_social_media_posts_status ON public.social_media_posts(status);

-- Update the generation_progress field to track detailed status
COMMENT ON COLUMN public.social_media_posts.media_type IS 'Type of social media content: company_targeting, evergreen_content, advertisement';
COMMENT ON COLUMN public.social_media_posts.status IS 'Generation status: pending, generating_concepts, generating_caption, generating_images, completed, failed';
COMMENT ON COLUMN public.social_media_posts.generation_progress IS 'Detailed progress tracking for generation steps';