-- Create tables for Instagram automation via Phyllo
-- 1) instagram_accounts
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  phyllo_profile_id text NULL,
  phyllo_account_id text NULL,
  username text NULL,
  platform text NOT NULL DEFAULT 'instagram',
  access_status text NULL,
  connected_at timestamptz NULL DEFAULT now(),
  last_sync_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin only access to instagram accounts"
  ON public.instagram_accounts
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) automation_rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  rule_type text NOT NULL, -- e.g. auto_comment, auto_like, dm_new_followers
  enabled boolean NOT NULL DEFAULT false,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule text NULL, -- optional cron or window
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin only access to automation rules"
  ON public.automation_rules
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) scheduled_posts
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  social_media_post_id uuid NULL, -- link to generated post
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, queued, published, failed, cancelled
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, -- caption, media, etc
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin only access to scheduled posts"
  ON public.scheduled_posts
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) instagram_engagement_log
CREATE TABLE IF NOT EXISTS public.instagram_engagement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- like, comment, dm
  target_post_url text NULL,
  target_user text NULL,
  comment_text text NULL,
  status text NOT NULL DEFAULT 'queued', -- queued, success, failed
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_engagement_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin only access to engagement log"
  ON public.instagram_engagement_log
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Triggers for updated_at
DO $$ BEGIN
  CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON public.instagram_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
