-- Add metadata columns to images table for better auditing and organization
ALTER TABLE public.images 
ADD COLUMN blog_id UUID REFERENCES public.blogs(id),
ADD COLUMN blog_section TEXT,
ADD COLUMN generation_batch_id TEXT;