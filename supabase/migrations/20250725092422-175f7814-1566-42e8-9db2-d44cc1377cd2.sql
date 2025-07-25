-- Create storage bucket for generated images
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-images', 'generated-images', true);

-- Create storage policies for the generated-images bucket
CREATE POLICY "Generated images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'generated-images');

CREATE POLICY "Authenticated users can upload images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'generated-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'generated-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'generated-images' AND auth.uid() IS NOT NULL);

-- Clean up existing base64 images from the database
DELETE FROM images WHERE url LIKE 'data:image%';