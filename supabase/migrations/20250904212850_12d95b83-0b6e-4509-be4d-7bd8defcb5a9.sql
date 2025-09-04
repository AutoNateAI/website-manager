-- Fix function search path security warnings by adding search_path to functions that don't have it
-- These functions need to be updated to be security compliant

-- Check which functions exist and need search_path updates
CREATE OR REPLACE FUNCTION public.validate_advertisement_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- If link_type is 'product', product_id must be set
  IF NEW.link_type = 'product' AND NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required when link_type is product';
  END IF;
  
  -- If link_type is 'external', link_url should be set
  IF NEW.link_type = 'external' AND NEW.link_url IS NULL THEN
    RAISE EXCEPTION 'link_url is required when link_type is external';
  END IF;
  
  -- Validate product_id values
  IF NEW.product_id IS NOT NULL AND NEW.product_id NOT IN ('ai-grant-assistant', 'lit-review-ai', 'data-pipeline-builder') THEN
    RAISE EXCEPTION 'Invalid product_id. Must be one of: ai-grant-assistant, lit-review-ai, data-pipeline-builder';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the campaign revenue function as well
CREATE OR REPLACE FUNCTION public.update_campaign_revenue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update actual revenue for associated campaigns
  UPDATE public.campaigns 
  SET actual_revenue = (
    SELECT COALESCE(SUM(dh.deal_amount), 0)
    FROM public.deal_history dh
    WHERE dh.campaign_id = NEW.campaign_id
  )
  WHERE id = NEW.campaign_id;
  
  RETURN NEW;
END;
$function$;