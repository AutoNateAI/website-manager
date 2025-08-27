-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  target_entities JSONB DEFAULT '[]'::jsonb, -- Array of entity IDs and types
  financial_target INTEGER, -- Target amount in cents
  projected_revenue INTEGER DEFAULT 0, -- Sum of lead projections in cents  
  actual_revenue INTEGER DEFAULT 0, -- Sum of closed deals in cents
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_metrics JSONB DEFAULT '{}'::jsonb, -- messages, comments, emails targets
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT, -- Person assigned to this task
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sessions table for tracking work sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_hours DECIMAL DEFAULT 4.0,
  activities_completed JSONB DEFAULT '[]'::jsonb, -- Array of completed activities
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add financial fields to people (leads) table
ALTER TABLE public.people
ADD COLUMN financial_projection INTEGER, -- Projected deal value in cents
ADD COLUMN projection_justification TEXT, -- Why this projection
ADD COLUMN deal_closed_at TIMESTAMP WITH TIME ZONE, -- When deal was closed
ADD COLUMN deal_amount INTEGER, -- Actual closed deal amount in cents
ADD COLUMN deal_status TEXT DEFAULT 'prospect' CHECK (deal_status IN ('prospect', 'qualified', 'negotiating', 'closed_won', 'closed_lost'));

-- Create deal_history table
CREATE TABLE public.deal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  deal_amount INTEGER NOT NULL, -- Amount in cents
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_history ENABLE ROW LEVEL SECURITY;

-- Create policies for all new tables
CREATE POLICY "Authenticated users can manage campaigns" ON public.campaigns FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage goals" ON public.goals FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage tasks" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage sessions" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage deal history" ON public.deal_history FOR ALL USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to update campaign actual_revenue when deals are closed
CREATE OR REPLACE FUNCTION update_campaign_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Update actual revenue for associated campaigns
  UPDATE public.campaigns 
  SET actual_revenue = (
    SELECT COALESCE(SUM(dh.deal_amount), 0)
    FROM public.deal_history dh
    WHERE dh.campaign_id = NEW.campaign_id
  )
  WHERE id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_revenue
  AFTER INSERT ON public.deal_history
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_revenue();