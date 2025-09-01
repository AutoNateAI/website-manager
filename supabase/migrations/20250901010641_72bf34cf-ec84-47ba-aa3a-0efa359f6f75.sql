-- Enable realtime for social media tables
ALTER TABLE public.social_media_posts REPLICA IDENTITY FULL;
ALTER TABLE public.social_media_images REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_media_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_media_images;