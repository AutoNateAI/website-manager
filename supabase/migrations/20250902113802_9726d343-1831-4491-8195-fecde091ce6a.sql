-- Create campaign_sops junction table to link campaigns with SOPs
CREATE TABLE public.campaign_sops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  sop_document_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, sop_document_id)
);

-- Enable RLS
ALTER TABLE public.campaign_sops ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin access
CREATE POLICY "Admin only access to campaign sops" 
ON public.campaign_sops 
FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));