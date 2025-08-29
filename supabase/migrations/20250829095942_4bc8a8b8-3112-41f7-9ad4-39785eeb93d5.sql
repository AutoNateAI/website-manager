-- Create slide_decks table
CREATE TABLE public.slide_decks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_audience TEXT, -- leads, internal-team, specific-team
  topic TEXT,
  presentation_style TEXT, -- professional, casual, technical
  slide_count INTEGER NOT NULL DEFAULT 10,
  insights TEXT, -- custom user insights
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, generated, completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create slides table
CREATE TABLE public.slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES public.slide_decks(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  speaker_notes TEXT,
  image_url TEXT,
  image_prompt TEXT,
  layout_type TEXT DEFAULT 'title-content', -- title-content, image-focus, text-heavy
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deck_id, slide_number)
);

-- Create core_concepts table (for flashcards)
CREATE TABLE public.core_concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES public.slide_decks(id) ON DELETE CASCADE,
  concept_title TEXT NOT NULL,
  concept_description TEXT NOT NULL,
  importance_level INTEGER DEFAULT 3, -- 1-5 scale
  related_slide_numbers INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES public.slide_decks(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL, -- multiple-choice, short-answer
  question_text TEXT NOT NULL,
  options JSONB, -- for multiple choice options
  correct_answer TEXT,
  explanation TEXT,
  difficulty_level INTEGER DEFAULT 2, -- 1-3 scale
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_responses table (for tracking user responses)
CREATE TABLE public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.slide_decks(id) ON DELETE CASCADE,
  user_response TEXT NOT NULL,
  is_correct BOOLEAN,
  response_time_seconds INTEGER,
  session_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.slide_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage slide decks" ON public.slide_decks
FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage slides" ON public.slides
FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage core concepts" ON public.core_concepts
FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage assessments" ON public.assessments
FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage assessment responses" ON public.assessment_responses
FOR ALL USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_slide_decks_updated_at
  BEFORE UPDATE ON public.slide_decks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_slides_updated_at
  BEFORE UPDATE ON public.slides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_slide_decks_created_at ON public.slide_decks(created_at DESC);
CREATE INDEX idx_slide_decks_status ON public.slide_decks(status);
CREATE INDEX idx_slides_deck_id ON public.slides(deck_id);
CREATE INDEX idx_slides_slide_number ON public.slides(deck_id, slide_number);
CREATE INDEX idx_core_concepts_deck_id ON public.core_concepts(deck_id);
CREATE INDEX idx_assessments_deck_id ON public.assessments(deck_id);
CREATE INDEX idx_assessment_responses_deck_id ON public.assessment_responses(deck_id);