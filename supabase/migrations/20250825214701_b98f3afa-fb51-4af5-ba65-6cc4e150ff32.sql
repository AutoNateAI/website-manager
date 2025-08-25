-- Create social media posts table
CREATE TABLE public.social_media_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin')),
  style TEXT NOT NULL,
  voice TEXT NOT NULL,
  source_items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {type: 'blog'|'live_build'|'ad', id: uuid, title: string}
  caption TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  image_seed_url TEXT,
  image_seed_instructions TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social media images table (for the 9 images in each carousel)
CREATE TABLE public.social_media_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  carousel_index INTEGER NOT NULL CHECK (carousel_index BETWEEN 1 AND 3),
  image_index INTEGER NOT NULL CHECK (image_index BETWEEN 1 AND 9),
  image_url TEXT NOT NULL,
  image_prompt TEXT NOT NULL,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, carousel_index, image_index)
);

-- Enable RLS
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for social media posts
CREATE POLICY "Authenticated users can manage social media posts" 
ON public.social_media_posts 
FOR ALL 
USING (true);

CREATE POLICY "Anyone can view published social media posts" 
ON public.social_media_posts 
FOR SELECT 
USING (is_published = true);

-- Create RLS policies for social media images
CREATE POLICY "Authenticated users can manage social media images" 
ON public.social_media_images 
FOR ALL 
USING (true);

CREATE POLICY "Anyone can view images of published posts" 
ON public.social_media_images 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.social_media_posts p 
  WHERE p.id = social_media_images.post_id AND p.is_published = true
));

-- Create indexes for better performance
CREATE INDEX idx_social_media_posts_platform ON public.social_media_posts(platform);
CREATE INDEX idx_social_media_posts_created_at ON public.social_media_posts(created_at DESC);
CREATE INDEX idx_social_media_images_post_carousel ON public.social_media_images(post_id, carousel_index);

-- Create update trigger for social media posts
CREATE TRIGGER update_social_media_posts_updated_at
BEFORE UPDATE ON public.social_media_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create update trigger for social media images
CREATE TRIGGER update_social_media_images_updated_at
BEFORE UPDATE ON public.social_media_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();