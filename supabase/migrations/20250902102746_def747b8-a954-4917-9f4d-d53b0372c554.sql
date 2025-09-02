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

-- Create RLS policies (with IF NOT EXISTS alternative handling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'sop_templates' AND policyname = 'Admin only access to sop templates'
  ) THEN
    CREATE POLICY "Admin only access to sop templates"
    ON public.sop_templates
    FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'sop_screenshots' AND policyname = 'Admin only access to sop screenshots'
  ) THEN
    CREATE POLICY "Admin only access to sop screenshots"
    ON public.sop_screenshots
    FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'sop_versions' AND policyname = 'Admin only access to sop versions'
  ) THEN
    CREATE POLICY "Admin only access to sop versions"
    ON public.sop_versions
    FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

-- Add foreign key constraints (check if they exist first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_sop_screenshots_document'
  ) THEN
    ALTER TABLE public.sop_screenshots
    ADD CONSTRAINT fk_sop_screenshots_document
    FOREIGN KEY (sop_document_id) REFERENCES public.sop_documents(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_sop_versions_document'
  ) THEN
    ALTER TABLE public.sop_versions
    ADD CONSTRAINT fk_sop_versions_document
    FOREIGN KEY (sop_document_id) REFERENCES public.sop_documents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create triggers for updated_at (check if they exist first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_sop_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_sop_templates_updated_at
    BEFORE UPDATE ON public.sop_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_sop_screenshots_updated_at'
  ) THEN
    CREATE TRIGGER update_sop_screenshots_updated_at
    BEFORE UPDATE ON public.sop_screenshots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;