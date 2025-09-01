-- Check if columns exist and add them if they don't
DO $$
BEGIN
    -- Add media_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'social_media_posts' 
                   AND column_name = 'media_type') THEN
        ALTER TABLE public.social_media_posts 
        ADD COLUMN media_type text DEFAULT 'evergreen_content'::text;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'social_media_posts' 
                   AND column_name = 'status') THEN
        ALTER TABLE public.social_media_posts 
        ADD COLUMN status text DEFAULT 'completed'::text;
    END IF;
    
    -- Add generation_progress column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'social_media_posts' 
                   AND column_name = 'generation_progress') THEN
        ALTER TABLE public.social_media_posts 
        ADD COLUMN generation_progress jsonb DEFAULT '{}'::jsonb;
    END IF;
END
$$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_social_media_posts_status ON public.social_media_posts(status);

-- Update column comments
COMMENT ON COLUMN public.social_media_posts.media_type IS 'Type of social media content: company_targeting, evergreen_content, advertisement';
COMMENT ON COLUMN public.social_media_posts.status IS 'Generation status: pending, generating_concepts, generating_caption, generating_images, completed, failed';
COMMENT ON COLUMN public.social_media_posts.generation_progress IS 'Detailed progress tracking for generation steps';