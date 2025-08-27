-- Add financial tracking to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN financial_target INTEGER, -- Target amount in cents
ADD COLUMN projected_revenue INTEGER DEFAULT 0, -- Sum of lead projections in cents
ADD COLUMN actual_revenue INTEGER DEFAULT 0; -- Sum of closed deals in cents

-- Add financial fields to people (leads) table
ALTER TABLE public.people
ADD COLUMN financial_projection INTEGER, -- Projected deal value in cents
ADD COLUMN projection_justification TEXT, -- Why this projection
ADD COLUMN deal_closed_at TIMESTAMP WITH TIME ZONE, -- When deal was closed
ADD COLUMN deal_amount INTEGER, -- Actual closed deal amount in cents
ADD COLUMN deal_status TEXT DEFAULT 'prospect' CHECK (deal_status IN ('prospect', 'qualified', 'negotiating', 'closed_won', 'closed_lost'));

-- Create a table to track deal history
CREATE TABLE public.deal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  deal_amount INTEGER NOT NULL, -- Amount in cents
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on deal_history
ALTER TABLE public.deal_history ENABLE ROW LEVEL SECURITY;

-- Create policy for deal_history
CREATE POLICY "Authenticated users can manage deal history" 
ON public.deal_history 
FOR ALL 
USING (true);

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