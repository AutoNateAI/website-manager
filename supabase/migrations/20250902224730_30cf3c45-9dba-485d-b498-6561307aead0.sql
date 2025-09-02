-- Create table for tracking like count history
CREATE TABLE public.comment_like_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.social_media_comments(id) ON DELETE CASCADE,
  previous_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  changed_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.comment_like_history ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin only access to comment like history" 
ON public.comment_like_history 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));