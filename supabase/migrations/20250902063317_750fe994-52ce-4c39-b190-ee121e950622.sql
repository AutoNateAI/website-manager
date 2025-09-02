-- Instagram Intelligence Platform Schema (Fixed Order)

-- Instagram users discovered through engagement and analysis (create first - no dependencies)
CREATE TABLE public.instagram_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  follower_count INTEGER,
  following_count INTEGER,
  post_count INTEGER,
  is_business_account BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  profile_image_url TEXT,
  external_url TEXT,
  location TEXT,
  engagement_rate DECIMAL(5,2),
  account_type TEXT, -- 'personal', 'business', 'creator'
  niche_categories TEXT[],
  sentiment_score DECIMAL(3,2), -- -1 to 1
  influence_score INTEGER DEFAULT 0,
  follows_me BOOLEAN DEFAULT false,
  followed_at TIMESTAMP WITH TIME ZONE,
  discovered_through TEXT, -- 'post_engagement', 'location_tag', 'hashtag', 'manual'
  discovery_source_id UUID, -- reference to post or location where discovered
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Target posts that user wants to track and analyze (now can reference instagram_users)
CREATE TABLE public.instagram_target_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_url TEXT NOT NULL UNIQUE,
  post_id TEXT,
  poster_username TEXT,
  poster_user_id UUID REFERENCES public.instagram_users(id),
  post_content TEXT,
  post_timestamp TIMESTAMP WITH TIME ZONE,
  location_tag TEXT,
  hashtags TEXT[],
  mention_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  analysis_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User's engagement activities (comments, likes, follows)
CREATE TABLE public.engagement_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_post_id UUID REFERENCES public.instagram_target_posts(id),
  target_user_id UUID REFERENCES public.instagram_users(id),
  activity_type TEXT NOT NULL, -- 'comment', 'like', 'follow', 'story_view', 'dm'
  content TEXT, -- comment text or activity description
  parent_comment_id UUID REFERENCES public.engagement_activities(id), -- for reply threads
  response_received BOOLEAN DEFAULT false,
  response_content TEXT,
  response_timestamp TIMESTAMP WITH TIME ZONE,
  sentiment_analysis TEXT, -- 'positive', 'neutral', 'negative'
  topics TEXT[], -- extracted topics/keywords
  engagement_score INTEGER DEFAULT 0,
  led_to_follow BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User interactions and relationships mapping
CREATE TABLE public.user_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a_id UUID NOT NULL REFERENCES public.instagram_users(id),
  user_b_id UUID NOT NULL REFERENCES public.instagram_users(id),
  interaction_type TEXT NOT NULL, -- 'commented_on_same_post', 'tagged_together', 'mutual_followers'
  interaction_context TEXT, -- additional context about the interaction
  strength_score INTEGER DEFAULT 1, -- how strong the connection is
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_a_id, user_b_id, interaction_type)
);

-- Content analysis for posts and comments
CREATE TABLE public.content_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'post', 'comment', 'bio'
  content_id UUID NOT NULL, -- reference to target_posts or engagement_activities
  sentiment_score DECIMAL(3,2), -- -1 to 1
  sentiment_label TEXT, -- 'positive', 'neutral', 'negative'
  topics TEXT[],
  keywords TEXT[],
  hashtags TEXT[],
  mentions TEXT[],
  language TEXT DEFAULT 'en',
  confidence_score DECIMAL(3,2),
  analysis_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Location-based intelligence for user discovery
CREATE TABLE public.location_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_name TEXT NOT NULL,
  location_type TEXT, -- 'business', 'landmark', 'neighborhood', 'event'
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  user_count INTEGER DEFAULT 0, -- users discovered at this location
  engagement_quality_score DECIMAL(3,2), -- average quality of users from this location
  trending_topics TEXT[],
  active_times JSONB DEFAULT '[]', -- when users are most active at this location
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Network mapping for attention flow analysis
CREATE TABLE public.attention_network (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_user_id UUID NOT NULL REFERENCES public.instagram_users(id),
  target_user_id UUID NOT NULL REFERENCES public.instagram_users(id),
  attention_type TEXT NOT NULL, -- 'follows', 'frequent_commenter', 'mentions', 'tags'
  attention_strength INTEGER DEFAULT 1,
  frequency_score INTEGER DEFAULT 1, -- how often they interact
  recency_score INTEGER DEFAULT 1, -- how recent the interactions are
  influence_weight DECIMAL(5,2) DEFAULT 1.0,
  network_cluster TEXT, -- grouping for similar users/niches
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_user_id, target_user_id, attention_type)
);

-- Enable Row Level Security
ALTER TABLE public.instagram_target_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attention_network ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin only access for now)
CREATE POLICY "Admin only access to target posts" ON public.instagram_target_posts
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admin only access to instagram users" ON public.instagram_users
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admin only access to engagement activities" ON public.engagement_activities
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admin only access to user interactions" ON public.user_interactions
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admin only access to content analysis" ON public.content_analysis
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admin only access to location intelligence" ON public.location_intelligence
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admin only access to attention network" ON public.attention_network
FOR ALL USING (is_admin(auth.uid()));

-- Add indexes for performance
CREATE INDEX idx_target_posts_url ON public.instagram_target_posts(post_url);
CREATE INDEX idx_target_posts_poster ON public.instagram_target_posts(poster_user_id);
CREATE INDEX idx_instagram_users_username ON public.instagram_users(username);
CREATE INDEX idx_instagram_users_discovery ON public.instagram_users(discovered_through, discovery_source_id);
CREATE INDEX idx_engagement_activities_post ON public.engagement_activities(target_post_id);
CREATE INDEX idx_engagement_activities_user ON public.engagement_activities(target_user_id);
CREATE INDEX idx_engagement_activities_parent ON public.engagement_activities(parent_comment_id);
CREATE INDEX idx_user_interactions_users ON public.user_interactions(user_a_id, user_b_id);
CREATE INDEX idx_content_analysis_content ON public.content_analysis(content_type, content_id);
CREATE INDEX idx_attention_network_source ON public.attention_network(source_user_id);
CREATE INDEX idx_attention_network_target ON public.attention_network(target_user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_target_posts_updated_at
  BEFORE UPDATE ON public.instagram_target_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instagram_users_updated_at
  BEFORE UPDATE ON public.instagram_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_engagement_activities_updated_at
  BEFORE UPDATE ON public.engagement_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_intelligence_updated_at
  BEFORE UPDATE ON public.location_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attention_network_updated_at
  BEFORE UPDATE ON public.attention_network
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();