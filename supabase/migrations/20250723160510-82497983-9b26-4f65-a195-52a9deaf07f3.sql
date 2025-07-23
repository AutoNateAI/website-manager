-- Create table to track image generation sessions
CREATE TABLE public.generation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id TEXT NOT NULL UNIQUE,
  total_images INTEGER NOT NULL,
  completed_images INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.generation_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can manage generation sessions" 
ON public.generation_sessions 
FOR ALL 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_generation_sessions_updated_at
BEFORE UPDATE ON public.generation_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the generation_sessions table
ALTER TABLE public.generation_sessions REPLICA IDENTITY FULL;

-- Enable realtime for the images table  
ALTER TABLE public.images REPLICA IDENTITY FULL;