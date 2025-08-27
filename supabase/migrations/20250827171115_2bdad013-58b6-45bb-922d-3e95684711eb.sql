-- Secure sensitive business-intelligence tables with admin-only RLS
-- Drop all existing policies first to avoid conflicts

-- PEOPLE
DROP POLICY IF EXISTS "Authenticated users can manage people" ON public.people;
DROP POLICY IF EXISTS "Admins can manage people" ON public.people;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to people data"
ON public.people
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- COMPANIES
DROP POLICY IF EXISTS "Authenticated users can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to companies data"
ON public.companies
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- CAMPAIGNS
DROP POLICY IF EXISTS "Authenticated users can manage campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to campaigns data"
ON public.campaigns
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- GOALS
DROP POLICY IF EXISTS "Authenticated users can manage goals" ON public.goals;
DROP POLICY IF EXISTS "Admins can manage goals" ON public.goals;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to goals data"
ON public.goals
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- TASKS
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to tasks data"
ON public.tasks
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SESSIONS
DROP POLICY IF EXISTS "Authenticated users can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Admins can manage sessions" ON public.sessions;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to sessions data"
ON public.sessions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- DEAL HISTORY
DROP POLICY IF EXISTS "Authenticated users can manage deal history" ON public.deal_history;
DROP POLICY IF EXISTS "Admins can manage deal history" ON public.deal_history;
ALTER TABLE public.deal_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to deal history data"
ON public.deal_history
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- EVENTS
DROP POLICY IF EXISTS "Authenticated users can manage events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to events data"
ON public.events
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SERVICES
DROP POLICY IF EXISTS "Authenticated users can manage services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to services data"
ON public.services
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- NETWORKING EVENTS
DROP POLICY IF EXISTS "Authenticated users can manage networking events" ON public.networking_events;
DROP POLICY IF EXISTS "Admins can manage networking events" ON public.networking_events;
ALTER TABLE public.networking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to networking events data"
ON public.networking_events
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- EVENT CONNECTIONS
DROP POLICY IF EXISTS "Authenticated users can manage event connections" ON public.event_connections;
DROP POLICY IF EXISTS "Admins can manage event connections" ON public.event_connections;
ALTER TABLE public.event_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to event connections data"
ON public.event_connections
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SOCIAL POSTS
DROP POLICY IF EXISTS "Authenticated users can manage social posts" ON public.social_posts;
DROP POLICY IF EXISTS "Admins can manage social posts" ON public.social_posts;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to social posts data"
ON public.social_posts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SOCIAL INTERACTIONS
DROP POLICY IF EXISTS "Authenticated users can manage social interactions" ON public.social_interactions;
DROP POLICY IF EXISTS "Admins can manage social interactions" ON public.social_interactions;
ALTER TABLE public.social_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to social interactions data"
ON public.social_interactions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- PERSON NOTES
DROP POLICY IF EXISTS "Authenticated users can manage person notes" ON public.person_notes;
DROP POLICY IF EXISTS "Admins can manage person notes" ON public.person_notes;
ALTER TABLE public.person_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to person notes data"
ON public.person_notes
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- PRODUCT PEOPLE
DROP POLICY IF EXISTS "Authenticated users can manage product people" ON public.product_people;
DROP POLICY IF EXISTS "Admins can manage product people" ON public.product_people;
ALTER TABLE public.product_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to product people data"
ON public.product_people
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SERVICE PEOPLE
DROP POLICY IF EXISTS "Authenticated users can manage service people" ON public.service_people;
DROP POLICY IF EXISTS "Admins can manage service people" ON public.service_people;
ALTER TABLE public.service_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to service people data"
ON public.service_people
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- GENERATION SESSIONS
DROP POLICY IF EXISTS "Authenticated users can manage generation sessions" ON public.generation_sessions;
DROP POLICY IF EXISTS "Admins can manage generation sessions" ON public.generation_sessions;
ALTER TABLE public.generation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to generation sessions data"
ON public.generation_sessions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));