-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'virtual', -- 'virtual' or 'in_person'
  date_time TIMESTAMP WITH TIME ZONE,
  location TEXT, -- For in-person events
  virtual_link TEXT, -- For virtual events
  company_id UUID REFERENCES public.companies(id),
  organizer_person_id UUID REFERENCES public.people(id),
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
  tags JSONB DEFAULT '[]'::JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table (separate from products)
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  service_type TEXT, -- e.g., 'consulting', 'support', 'training'
  pricing_model TEXT, -- e.g., 'hourly', 'project', 'subscription'
  price_range TEXT,
  tags JSONB DEFAULT '[]'::JSONB,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_people junction table for linking people to products
CREATE TABLE public.product_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'employee', 'user', 'decision_maker', 'influencer'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, person_id, relationship_type)
);

-- Create service_people junction table for linking people to services
CREATE TABLE public.service_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'employee', 'user', 'decision_maker', 'influencer'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, person_id, relationship_type)
);

-- Add platform field to existing social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN IF NOT EXISTS platform_type TEXT DEFAULT 'linkedin'; -- 'linkedin', 'instagram', 'twitter', 'facebook'

-- Enable RLS on new tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_people ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for events
CREATE POLICY "Authenticated users can manage events" 
ON public.events 
FOR ALL 
USING (true);

-- Create RLS policies for services
CREATE POLICY "Authenticated users can manage services" 
ON public.services 
FOR ALL 
USING (true);

-- Create RLS policies for product_people
CREATE POLICY "Authenticated users can manage product people" 
ON public.product_people 
FOR ALL 
USING (true);

-- Create RLS policies for service_people
CREATE POLICY "Authenticated users can manage service people" 
ON public.service_people 
FOR ALL 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();