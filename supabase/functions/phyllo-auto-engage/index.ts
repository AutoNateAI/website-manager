import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { account_id, action_type, target_post_url, target_user, comment_text } = await req.json();
    if (!account_id || !action_type) return json({ error: 'account_id and action_type required' }, 400);

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase
      .from('instagram_engagement_log')
      .insert({
        account_id,
        action_type,
        target_post_url: target_post_url ?? null,
        target_user: target_user ?? null,
        comment_text: comment_text ?? null,
        status: 'queued',
      })
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return json({ engagement: data });
  } catch (err: any) {
    console.error('[phyllo-auto-engage] error:', err);
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
