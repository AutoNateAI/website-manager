-- Create sop_conversations table for tracking AI conversations
CREATE TABLE public.sop_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_document_id UUID NOT NULL,
  conversation_data JSONB NOT NULL DEFAULT '[]'::JSONB,
  extracted_data JSONB,
  extraction_status TEXT DEFAULT 'pending'::TEXT,
  status TEXT NOT NULL DEFAULT 'active'::TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sop_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin only access to sop conversations" 
ON public.sop_conversations 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add foreign key constraint
ALTER TABLE public.sop_conversations 
ADD CONSTRAINT fk_sop_conversations_sop_document 
FOREIGN KEY (sop_document_id) 
REFERENCES public.sop_documents(id) 
ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sop_conversations_updated_at
BEFORE UPDATE ON public.sop_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();