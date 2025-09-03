-- Add tracking fields to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN IF NOT EXISTS assigned_account_id UUID REFERENCES public.instagram_accounts(id),
ADD COLUMN IF NOT EXISTS post_status TEXT DEFAULT 'draft' CHECK (post_status IN ('draft', 'assigned', 'scheduled', 'posted', 'failed')),
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE;