-- Add RLS policies for product_access table to fix security warning
-- Enable RLS on product_access table (if not already enabled)
ALTER TABLE public.product_access ENABLE ROW LEVEL SECURITY;

-- Add policy for authenticated users to view their own product access
CREATE POLICY "Users can view their own product access" 
ON public.product_access 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.purchases p 
    WHERE p.id = product_access.purchase_id 
    AND p.user_id = auth.uid()
  )
);

-- Add policy for admins to manage all product access
CREATE POLICY "Admins can manage all product access" 
ON public.product_access 
FOR ALL 
USING (is_admin(auth.uid()));