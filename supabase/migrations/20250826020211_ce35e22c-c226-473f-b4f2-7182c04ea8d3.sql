-- Create networking events table for in-person networking
CREATE TABLE public.networking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  event_type TEXT DEFAULT 'conference',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event connections table to track people met at events
CREATE TABLE public.event_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.networking_events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  discussion_topics TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  connection_quality TEXT DEFAULT 'good', -- excellent, good, average, poor
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, person_id)
);

-- Create social posts table for virtual networking
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL, -- linkedin, instagram
  post_url TEXT NOT NULL,
  post_content TEXT,
  post_author_name TEXT,
  post_author_profile_url TEXT,
  media_urls JSONB DEFAULT '[]'::JSONB,
  post_timestamp TIMESTAMP WITH TIME ZONE,
  my_engagement_type TEXT, -- commented, liked, shared, none
  my_comment_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social interactions table for threaded conversations
CREATE TABLE public.social_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  parent_interaction_id UUID REFERENCES public.social_interactions(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  commenter_name TEXT NOT NULL,
  commenter_profile_url TEXT,
  comment_text TEXT NOT NULL,
  interaction_type TEXT NOT NULL, -- my_comment, reply_to_me, reply_to_others
  interaction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create person notes table for periodic notes
CREATE TABLE public.person_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  note_category TEXT DEFAULT 'general', -- general, business, personal, follow_up
  priority TEXT DEFAULT 'normal', -- high, normal, low
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.networking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can manage networking events" 
ON public.networking_events 
FOR ALL 
USING (true);

CREATE POLICY "Authenticated users can manage event connections" 
ON public.event_connections 
FOR ALL 
USING (true);

CREATE POLICY "Authenticated users can manage social posts" 
ON public.social_posts 
FOR ALL 
USING (true);

CREATE POLICY "Authenticated users can manage social interactions" 
ON public.social_interactions 
FOR ALL 
USING (true);

CREATE POLICY "Authenticated users can manage person notes" 
ON public.person_notes 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_event_connections_event_id ON public.event_connections(event_id);
CREATE INDEX idx_event_connections_person_id ON public.event_connections(person_id);
CREATE INDEX idx_social_interactions_post_id ON public.social_interactions(post_id);
CREATE INDEX idx_social_interactions_parent_id ON public.social_interactions(parent_interaction_id);
CREATE INDEX idx_person_notes_person_id ON public.person_notes(person_id);
CREATE INDEX idx_person_notes_created_at ON public.person_notes(created_at DESC);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_networking_events_updated_at
BEFORE UPDATE ON public.networking_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_connections_updated_at
BEFORE UPDATE ON public.event_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_interactions_updated_at
BEFORE UPDATE ON public.social_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_person_notes_updated_at
BEFORE UPDATE ON public.person_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();