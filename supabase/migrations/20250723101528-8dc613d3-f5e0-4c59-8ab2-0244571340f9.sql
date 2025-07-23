-- Create images table for better image management
CREATE TABLE public.images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Create policies for images
CREATE POLICY "Authenticated users can manage images" 
ON public.images 
FOR ALL 
USING (true);

-- Create blog_images table to link images to blogs with position info
CREATE TABLE public.blog_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  position TEXT NOT NULL, -- e.g., "after_heading_1", "after_heading_2", etc.
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blog_id, image_id, position)
);

-- Enable RLS
ALTER TABLE public.blog_images ENABLE ROW LEVEL SECURITY;

-- Create policies for blog_images
CREATE POLICY "Authenticated users can manage blog images" 
ON public.blog_images 
FOR ALL 
USING (true);

-- Create trigger for images updated_at
CREATE TRIGGER update_images_updated_at
BEFORE UPDATE ON public.images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to rebuild content_images array for a blog
CREATE OR REPLACE FUNCTION public.rebuild_blog_content_images(blog_id_param UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;