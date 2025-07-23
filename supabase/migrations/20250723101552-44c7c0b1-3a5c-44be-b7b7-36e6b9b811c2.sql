-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.rebuild_blog_content_images(blog_id_param UUID)
RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  content_images_array JSONB := '[]'::JSONB;
  image_record RECORD;
BEGIN
  -- Get all images for this blog ordered by position and display_order
  FOR image_record IN 
    SELECT 
      i.url,
      i.alt_text,
      i.caption,
      bi.position
    FROM public.blog_images bi
    JOIN public.images i ON bi.image_id = i.id
    WHERE bi.blog_id = blog_id_param
    ORDER BY bi.position, bi.display_order
  LOOP
    content_images_array := content_images_array || jsonb_build_object(
      'url', image_record.url,
      'alt', COALESCE(image_record.alt_text, ''),
      'caption', COALESCE(image_record.caption, ''),
      'position', image_record.position
    );
  END LOOP;
  
  -- Update the blog's content_images field
  UPDATE public.blogs 
  SET content_images = content_images_array,
      updated_at = now()
  WHERE id = blog_id_param;
  
  RETURN content_images_array;
END;
$$;