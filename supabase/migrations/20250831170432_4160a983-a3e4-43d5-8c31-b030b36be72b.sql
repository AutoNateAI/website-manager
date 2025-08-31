-- Update companies table to use target_type instead of industry and add foundation-specific fields
ALTER TABLE public.companies 
  RENAME COLUMN industry TO target_type;

-- Add foundation-specific fields to companies table
ALTER TABLE public.companies 
  ADD COLUMN propublic_link text,
  ADD COLUMN endowment_balance bigint,
  ADD COLUMN total_grants_paid bigint,
  ADD COLUMN program_expenses bigint,
  ADD COLUMN top_vendors text,
  ADD COLUMN leadership_compensation jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN form_990_years jsonb DEFAULT '[]'::jsonb;