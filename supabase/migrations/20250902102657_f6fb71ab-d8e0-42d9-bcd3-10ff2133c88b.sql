-- Create sop_templates table for SOP structure templates
CREATE TABLE IF NOT EXISTS public.sop_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  template_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  screenshot_placeholders JSONB DEFAULT '[]'::jsonb,
  formatting_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sop_screenshots table for managing SOP images
CREATE TABLE IF NOT EXISTS public.sop_screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_document_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  position_section TEXT NOT NULL,
  position_order INTEGER DEFAULT 0,
  placeholder_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sop_versions table for version control
CREATE TABLE IF NOT EXISTS public.sop_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_document_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  structured_data JSONB DEFAULT '{}'::jsonb,
  change_description TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to existing tables
ALTER TABLE public.sop_documents 
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS screenshots_count INTEGER DEFAULT 0;

ALTER TABLE public.sop_conversations 
ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversation_stage TEXT DEFAULT 'discussion',
ADD COLUMN IF NOT EXISTS template_suggestions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS generation_ready BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.sop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin only access to sop templates"
ON public.sop_templates
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin only access to sop screenshots"
ON public.sop_screenshots
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin only access to sop versions"
ON public.sop_versions
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add foreign key constraints
ALTER TABLE public.sop_screenshots
ADD CONSTRAINT IF NOT EXISTS fk_sop_screenshots_document
FOREIGN KEY (sop_document_id) REFERENCES public.sop_documents(id) ON DELETE CASCADE;

ALTER TABLE public.sop_versions
ADD CONSTRAINT IF NOT EXISTS fk_sop_versions_document
FOREIGN KEY (sop_document_id) REFERENCES public.sop_documents(id) ON DELETE CASCADE;

-- Create triggers for updated_at
CREATE TRIGGER update_sop_templates_updated_at
BEFORE UPDATE ON public.sop_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sop_screenshots_updated_at
BEFORE UPDATE ON public.sop_screenshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default SOP templates
INSERT INTO public.sop_templates (title, description, category, template_structure, sections, screenshot_placeholders) VALUES
('Process Documentation Template', 'Standard template for documenting business processes', 'process', 
 '{"type": "process", "format": "structured"}',
 '[
   {"id": "overview", "title": "Process Overview", "required": true, "order": 1},
   {"id": "prerequisites", "title": "Prerequisites", "required": true, "order": 2},
   {"id": "steps", "title": "Step-by-Step Instructions", "required": true, "order": 3},
   {"id": "troubleshooting", "title": "Troubleshooting", "required": false, "order": 4},
   {"id": "resources", "title": "Additional Resources", "required": false, "order": 5}
 ]',
 '[
   {"section": "overview", "description": "Process flow diagram"},
   {"section": "steps", "description": "Screenshots for each major step"},
   {"section": "troubleshooting", "description": "Error message screenshots"}
 ]'
),
('Training Materials Template', 'Template for creating training documentation', 'training',
 '{"type": "training", "format": "educational"}',
 '[
   {"id": "objectives", "title": "Learning Objectives", "required": true, "order": 1},
   {"id": "introduction", "title": "Introduction", "required": true, "order": 2},
   {"id": "modules", "title": "Training Modules", "required": true, "order": 3},
   {"id": "exercises", "title": "Practical Exercises", "required": false, "order": 4},
   {"id": "assessment", "title": "Assessment", "required": false, "order": 5},
   {"id": "resources", "title": "Additional Resources", "required": false, "order": 6}
 ]',
 '[
   {"section": "introduction", "description": "Welcome screen or dashboard"},
   {"section": "modules", "description": "Screenshots of key interface elements"},
   {"section": "exercises", "description": "Example completion screenshots"}
 ]'
),
('Policy Document Template', 'Template for organizational policies and procedures', 'policy',
 '{"type": "policy", "format": "formal"}',
 '[
   {"id": "purpose", "title": "Purpose and Scope", "required": true, "order": 1},
   {"id": "definitions", "title": "Definitions", "required": false, "order": 2},
   {"id": "policy", "title": "Policy Statement", "required": true, "order": 3},
   {"id": "procedures", "title": "Procedures", "required": true, "order": 4},
   {"id": "compliance", "title": "Compliance and Monitoring", "required": false, "order": 5},
   {"id": "references", "title": "References", "required": false, "order": 6}
 ]',
 '[
   {"section": "procedures", "description": "Workflow diagrams"},
   {"section": "compliance", "description": "Monitoring dashboard screenshots"}
 ]'
) ON CONFLICT (title) DO NOTHING;