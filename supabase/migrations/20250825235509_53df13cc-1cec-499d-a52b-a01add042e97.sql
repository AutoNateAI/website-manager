-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  linkedin_url TEXT,
  industry TEXT,
  location TEXT,
  company_size TEXT,
  targeting_notes TEXT,
  chatgpt_links JSONB DEFAULT '[]'::JSONB,
  notebooklm_links JSONB DEFAULT '[]'::JSONB,
  tags JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create people table
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  profile_image_url TEXT,
  position TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  location TEXT,
  targeting_notes TEXT,
  chatgpt_links JSONB DEFAULT '[]'::JSONB,
  notebooklm_links JSONB DEFAULT '[]'::JSONB,
  tags JSONB DEFAULT '[]'::JSONB,
  lead_status TEXT DEFAULT 'prospect'::TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Authenticated users can manage companies" 
ON public.companies 
FOR ALL 
USING (true);

-- Create RLS policies for people
CREATE POLICY "Authenticated users can manage people" 
ON public.people 
FOR ALL 
USING (true);

-- Create indexes for better search performance
CREATE INDEX idx_companies_name ON public.companies USING GIN (to_tsvector('english', name));
CREATE INDEX idx_companies_industry ON public.companies (industry);
CREATE INDEX idx_companies_location ON public.companies (location);

CREATE INDEX idx_people_name ON public.people USING GIN (to_tsvector('english', name));
CREATE INDEX idx_people_position ON public.people (position);
CREATE INDEX idx_people_company_id ON public.people (company_id);
CREATE INDEX idx_people_location ON public.people (location);
CREATE INDEX idx_people_lead_status ON public.people (lead_status);

-- Create function to update timestamps
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_people_updated_at
BEFORE UPDATE ON public.people
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();