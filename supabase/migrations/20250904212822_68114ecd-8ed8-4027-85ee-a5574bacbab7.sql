-- Create Blitz Campaigns Table
CREATE TABLE public.blitz_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_date date NOT NULL,
  target_count integer NOT NULL DEFAULT 16,
  posts_per_target integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure one blitz campaign per date
  UNIQUE(campaign_date)
);

-- Create Campaign Targets Table
CREATE TABLE public.campaign_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blitz_campaign_id uuid NOT NULL REFERENCES public.blitz_campaigns(id) ON DELETE CASCADE,
  instagram_user_id uuid NOT NULL REFERENCES public.instagram_users(id) ON DELETE CASCADE,
  target_timezone text NOT NULL CHECK (target_timezone IN ('ET', 'CT', 'PT', 'HST')),
  wave_assignment integer NOT NULL CHECK (wave_assignment IN (1, 2, 3, 4)),
  current_wave integer NOT NULL DEFAULT 1 CHECK (current_wave IN (1, 2, 3)),
  wave_status text NOT NULL DEFAULT 'pending' CHECK (wave_status IN ('pending', 'scheduled', 'posted', 'responded', 'no_response')),
  outcome text DEFAULT 'unknown' CHECK (outcome IN ('unknown', 'dm_opened', 'dm_replied', 'booked_call', 'won', 'lost', 'no_response')),
  outcome_notes text,
  last_blitz_date timestamp with time zone,
  next_action_date timestamp with time zone,
  response_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Prevent duplicate targets in same campaign
  UNIQUE(blitz_campaign_id, instagram_user_id)
);

-- Create Blitz Posts Table (enhanced scheduled_posts)
CREATE TABLE public.blitz_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_target_id uuid NOT NULL REFERENCES public.campaign_targets(id) ON DELETE CASCADE,
  social_media_post_id uuid NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  scheduled_posts_id uuid REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  wave_number integer NOT NULL CHECK (wave_number IN (1, 2, 3)),
  post_order integer NOT NULL CHECK (post_order IN (1, 2, 3)),
  scheduled_for timestamp with time zone NOT NULL,
  posted_at timestamp with time zone,
  engagement_metrics jsonb DEFAULT '{}', -- likes, comments, saves, profile_visits
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posted', 'failed', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create Target Outcomes Table
CREATE TABLE public.target_outcomes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_target_id uuid NOT NULL REFERENCES public.campaign_targets(id) ON DELETE CASCADE,
  outcome_type text NOT NULL CHECK (outcome_type IN ('profile_visit', 'dm_opened', 'dm_replied', 'comment_received', 'follow_back', 'booked_call', 'won_deal', 'lost_deal')),
  outcome_date timestamp with time zone NOT NULL DEFAULT now(),
  outcome_value numeric, -- deal value if won
  notes text,
  source_post_id uuid REFERENCES public.social_media_posts(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_blitz_campaigns_date ON public.blitz_campaigns(campaign_date);
CREATE INDEX idx_blitz_campaigns_status ON public.blitz_campaigns(status);
CREATE INDEX idx_campaign_targets_blitz_id ON public.campaign_targets(blitz_campaign_id);
CREATE INDEX idx_campaign_targets_instagram_user ON public.campaign_targets(instagram_user_id);
CREATE INDEX idx_campaign_targets_wave_status ON public.campaign_targets(wave_status, current_wave);
CREATE INDEX idx_campaign_targets_next_action ON public.campaign_targets(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX idx_blitz_posts_campaign_target ON public.blitz_posts(campaign_target_id);
CREATE INDEX idx_blitz_posts_scheduled_for ON public.blitz_posts(scheduled_for);
CREATE INDEX idx_target_outcomes_target_id ON public.target_outcomes(campaign_target_id);
CREATE INDEX idx_target_outcomes_type_date ON public.target_outcomes(outcome_type, outcome_date);

-- Enable RLS on all new tables
ALTER TABLE public.blitz_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blitz_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_outcomes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin only for now)
CREATE POLICY "Admin only access to blitz campaigns" ON public.blitz_campaigns
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admin only access to campaign targets" ON public.campaign_targets
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admin only access to blitz posts" ON public.blitz_posts
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admin only access to target outcomes" ON public.target_outcomes
  FOR ALL USING (is_admin(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_blitz_campaigns_updated_at
  BEFORE UPDATE ON public.blitz_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_targets_updated_at
  BEFORE UPDATE ON public.campaign_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blitz_posts_updated_at
  BEFORE UPDATE ON public.blitz_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();