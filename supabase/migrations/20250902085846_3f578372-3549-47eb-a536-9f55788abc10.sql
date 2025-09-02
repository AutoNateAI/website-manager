-- Create search queries management tables
CREATE TABLE public.search_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}',
  location_filters JSONB DEFAULT '[]',
  hashtag_filters JSONB DEFAULT '[]',
  engagement_thresholds JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin only access to search queries"
ON public.search_queries
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create SOPs documentation tables
CREATE TABLE public.sop_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  structured_data JSONB DEFAULT '{}',
  content TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sop_documents ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin only access to SOP documents"
ON public.sop_documents
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create SOP conversations table
CREATE TABLE public.sop_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_document_id UUID REFERENCES public.sop_documents(id) ON DELETE CASCADE,
  conversation_data JSONB NOT NULL DEFAULT '[]',
  extraction_status TEXT DEFAULT 'pending',
  extracted_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sop_conversations ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin only access to SOP conversations"
ON public.sop_conversations
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create scoring algorithms configuration table
CREATE TABLE public.scoring_algorithms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  algorithm_type TEXT NOT NULL DEFAULT 'attention_score',
  weights JSONB NOT NULL DEFAULT '{}',
  thresholds JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scoring_algorithms ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin only access to scoring algorithms"
ON public.scoring_algorithms
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create junction table for post-search query relationships
CREATE TABLE public.post_search_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.instagram_target_posts(id) ON DELETE CASCADE,
  search_query_id UUID REFERENCES public.search_queries(id) ON DELETE CASCADE,
  discovery_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  relevance_score NUMERIC DEFAULT 0,
  UNIQUE(post_id, search_query_id)
);

-- Enable RLS
ALTER TABLE public.post_search_queries ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin only access to post search queries"
ON public.post_search_queries
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add attention scoring fields to existing instagram_target_posts table
ALTER TABLE public.instagram_target_posts 
ADD COLUMN attention_score NUMERIC DEFAULT 0,
ADD COLUMN authenticity_score NUMERIC DEFAULT 0,
ADD COLUMN market_fit_score NUMERIC DEFAULT 0,
ADD COLUMN network_value_score NUMERIC DEFAULT 0,
ADD COLUMN overall_attention_score NUMERIC DEFAULT 0,
ADD COLUMN scoring_metadata JSONB DEFAULT '{}',
ADD COLUMN last_scored_at TIMESTAMP WITH TIME ZONE;

-- Create trigger for automatic timestamp updates on all new tables
CREATE TRIGGER update_search_queries_updated_at
BEFORE UPDATE ON public.search_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sop_documents_updated_at
BEFORE UPDATE ON public.sop_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sop_conversations_updated_at
BEFORE UPDATE ON public.sop_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scoring_algorithms_updated_at
BEFORE UPDATE ON public.scoring_algorithms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default scoring algorithm
INSERT INTO public.scoring_algorithms (name, description, algorithm_type, weights, thresholds) VALUES 
('Default Attention Algorithm', 'Primary attention scoring algorithm based on engagement, authenticity, market fit, and network value', 'attention_score', 
'{"attention_magnetism": 0.4, "authenticity": 0.25, "market_fit": 0.2, "network_value": 0.15}',
'{"min_comments": 30, "real_commenter_ratio": 0.55, "min_monthly_posts": 1, "min_total_posts": 12, "min_engaged_posts": 3}'
);