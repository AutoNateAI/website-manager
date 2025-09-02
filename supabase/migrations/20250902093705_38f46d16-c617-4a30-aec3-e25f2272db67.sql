-- Add share_count and repost_count to instagram_target_posts
ALTER TABLE public.instagram_target_posts 
ADD COLUMN share_count integer DEFAULT 0,
ADD COLUMN repost_count integer DEFAULT 0;

-- Create table for tracking social media comments and threads
CREATE TABLE public.social_media_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.instagram_target_posts(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.social_media_comments(id) ON DELETE CASCADE,
  commenter_username text NOT NULL,
  commenter_display_name text,
  comment_text text NOT NULL,
  comment_timestamp timestamp with time zone NOT NULL,
  like_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  is_my_comment boolean DEFAULT false,
  is_reply_to_my_comment boolean DEFAULT false,
  thread_depth integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on social_media_comments
ALTER TABLE public.social_media_comments ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access to comments
CREATE POLICY "Admin only access to social media comments" 
ON public.social_media_comments 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_social_media_comments_post_id ON public.social_media_comments(post_id);
CREATE INDEX idx_social_media_comments_parent_id ON public.social_media_comments(parent_comment_id);
CREATE INDEX idx_social_media_comments_my_comment ON public.social_media_comments(is_my_comment) WHERE is_my_comment = true;
CREATE INDEX idx_social_media_comments_thread_depth ON public.social_media_comments(thread_depth);

-- Create trigger for updating updated_at
CREATE TRIGGER update_social_media_comments_updated_at
BEFORE UPDATE ON public.social_media_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();