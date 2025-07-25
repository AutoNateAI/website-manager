-- Add parent_image_id column to track image edit history
ALTER TABLE public.images 
ADD COLUMN parent_image_id UUID;

-- Add foreign key constraint for parent_image_id
ALTER TABLE public.images 
ADD CONSTRAINT fk_parent_image 
FOREIGN KEY (parent_image_id) 
REFERENCES public.images(id) 
ON DELETE SET NULL;