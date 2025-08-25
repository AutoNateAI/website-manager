-- Add notebook_lm_url and chatgpt_url columns to blogs table for tracking research sources
ALTER TABLE public.blogs 
ADD COLUMN notebook_lm_url TEXT,
ADD COLUMN chatgpt_url TEXT;