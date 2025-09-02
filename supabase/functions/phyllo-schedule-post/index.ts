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
    const { account_id, social_media_post_id, scheduled_for, payload } = await req.json();
    if (!account_id || !scheduled_for) {
      return json({ error: 'account_id and scheduled_for required' }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert({
        account_id,
        social_media_post_id,
        scheduled_for,
        payload: payload ?? {},
        status: 'pending',
      })
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return json({ scheduled: data });
  } catch (err: any) {
    console.error('[phyllo-schedule-post] error:', err);
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
