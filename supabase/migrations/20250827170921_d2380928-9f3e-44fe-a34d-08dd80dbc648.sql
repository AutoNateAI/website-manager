-- Secure sensitive business-intelligence tables with admin-only RLS
-- Uses existing public.is_admin(uuid) function

-- PEOPLE
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage people" ON public.people;
CREATE POLICY "Admins can manage people"
ON public.people
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- COMPANIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage companies" ON public.companies;
CREATE POLICY "Admins can manage companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- CAMPAIGNS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage campaigns" ON public.campaigns;
CREATE POLICY "Admins can manage campaigns"
ON public.campaigns
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- GOALS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage goals" ON public.goals;
CREATE POLICY "Admins can manage goals"
ON public.goals
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;
CREATE POLICY "Admins can manage tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SESSIONS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage sessions" ON public.sessions;
CREATE POLICY "Admins can manage sessions"
ON public.sessions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- DEAL HISTORY
ALTER TABLE public.deal_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage deal history" ON public.deal_history;
CREATE POLICY "Admins can manage deal history"
ON public.deal_history
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- EVENTS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage events" ON public.events;
CREATE POLICY "Admins can manage events"
ON public.events
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SERVICES
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON public.services;
CREATE POLICY "Admins can manage services"
ON public.services
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- NETWORKING EVENTS
ALTER TABLE public.networking_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage networking events" ON public.networking_events;
CREATE POLICY "Admins can manage networking events"
ON public.networking_events
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- EVENT CONNECTIONS
ALTER TABLE public.event_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage event connections" ON public.event_connections;
CREATE POLICY "Admins can manage event connections"
ON public.event_connections
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SOCIAL POSTS (retain public view policy for published if any; just secure manage)
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage social posts" ON public.social_posts;
CREATE POLICY "Admins can manage social posts"
ON public.social_posts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SOCIAL INTERACTIONS
ALTER TABLE public.social_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage social interactions" ON public.social_interactions;
CREATE POLICY "Admins can manage social interactions"
ON public.social_interactions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- PERSON NOTES
ALTER TABLE public.person_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage person notes" ON public.person_notes;
CREATE POLICY "Admins can manage person notes"
ON public.person_notes
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- PRODUCT PEOPLE
ALTER TABLE public.product_people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage product people" ON public.product_people;
CREATE POLICY "Admins can manage product people"
ON public.product_people
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- SERVICE PEOPLE
ALTER TABLE public.service_people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage service people" ON public.service_people;
CREATE POLICY "Admins can manage service people"
ON public.service_people
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- GENERATION SESSIONS
ALTER TABLE public.generation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage generation sessions" ON public.generation_sessions;
CREATE POLICY "Admins can manage generation sessions"
ON public.generation_sessions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));