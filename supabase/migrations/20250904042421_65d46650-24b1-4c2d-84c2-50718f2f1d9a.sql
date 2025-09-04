-- Make account_id nullable in scheduled_posts table and update constraints
ALTER TABLE public.scheduled_posts 
ALTER COLUMN account_id DROP NOT NULL;

-- Update the foreign key constraint to allow null values
ALTER TABLE public.scheduled_posts 
DROP CONSTRAINT IF EXISTS scheduled_posts_account_id_fkey;

-- Add the foreign key constraint back but allow nulls
ALTER TABLE public.scheduled_posts 
ADD CONSTRAINT scheduled_posts_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES public.instagram_accounts(id) ON DELETE SET NULL;