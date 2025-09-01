-- Fix security warning by setting search path on the increment function
CREATE OR REPLACE FUNCTION public.increment_image_progress(
  post_id_param UUID,
  carousel_index_param INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_progress JSONB;
  new_completed INTEGER;
BEGIN
  -- Get current progress
  SELECT generation_progress INTO current_progress
  FROM public.social_media_posts
  WHERE id = post_id_param;
  
  -- Calculate new completed count
  new_completed := COALESCE((current_progress->>'images_completed')::INTEGER, 0) + 1;
  
  -- Update progress atomically
  UPDATE public.social_media_posts
  SET generation_progress = COALESCE(current_progress, '{}'::JSONB) || jsonb_build_object(
    'step', 'generating_images',
    'images_completed', new_completed,
    'images_total', COALESCE((current_progress->>'images_total')::INTEGER, 9),
    'last_completed_image', carousel_index_param,
    'updated_at', NOW()::TEXT
  ),
  updated_at = NOW()
  WHERE id = post_id_param;
END;
$$;