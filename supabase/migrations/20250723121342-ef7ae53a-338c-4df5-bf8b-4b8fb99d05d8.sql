-- Migration to populate images and blog_images tables from existing content_images data

DO $$
DECLARE
  blog_record RECORD;
  image_element JSONB;
  new_image_id UUID;
  position_counter INTEGER;
BEGIN
  -- Loop through all blogs that have content_images
  FOR blog_record IN 
    SELECT id, content_images, title
    FROM public.blogs 
    WHERE content_images IS NOT NULL AND jsonb_array_length(content_images) > 0
  LOOP
    position_counter := 0;
    
    -- Loop through each image in the content_images array
    FOR image_element IN 
      SELECT * FROM jsonb_array_elements(blog_record.content_images)
    LOOP
      position_counter := position_counter + 1;
      
      -- Generate a new UUID for the image
      new_image_id := gen_random_uuid();
      
      -- Insert into images table
      INSERT INTO public.images (
        id,
        title,
        url,
        alt_text,
        caption,
        created_at,
        updated_at
      ) VALUES (
        new_image_id,
        COALESCE(image_element->>'alt', 'Image from ' || blog_record.title),
        image_element->>'url',
        COALESCE(image_element->>'alt', ''),
        COALESCE(image_element->>'caption', ''),
        now(),
        now()
      );
      
      -- Insert into blog_images table to create the relationship
      INSERT INTO public.blog_images (
        id,
        blog_id,
        image_id,
        position,
        display_order,
        created_at
      ) VALUES (
        gen_random_uuid(),
        blog_record.id,
        new_image_id,
        COALESCE(image_element->>'position', 'after_heading_' || position_counter::text),
        position_counter,
        now()
      );
      
    END LOOP;
    
    -- Rebuild the content_images array for this blog using the new function
    PERFORM public.rebuild_blog_content_images(blog_record.id);
    
  END LOOP;
  
  RAISE NOTICE 'Migration completed: populated images and blog_images tables from existing content_images data';
END $$;