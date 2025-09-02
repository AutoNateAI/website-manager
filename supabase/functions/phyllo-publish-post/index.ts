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
    const { scheduled_post_id, account_id, social_media_post_id } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    let schedId = scheduled_post_id;
    if (!schedId) {
      if (!account_id || !social_media_post_id) {
        return json({ error: 'Provide scheduled_post_id or (account_id & social_media_post_id)' }, 400);
      }
      const { data: created, error: insertErr } = await supabase
        .from('scheduled_posts')
        .insert({
          account_id,
          social_media_post_id,
          scheduled_for: new Date().toISOString(),
          status: 'pending',
        })
        .select('id')
        .maybeSingle();
      if (insertErr) throw insertErr;
      schedId = created?.id;
    }

    // Placeholder: mark as published immediately
    const { error: updErr } = await supabase
      .from('scheduled_posts')
      .update({ status: 'published' })
      .eq('id', schedId);
    if (updErr) throw updErr;

    if (social_media_post_id) {
      await supabase
        .from('social_media_posts')
        .update({ is_published: true })
        .eq('id', social_media_post_id);
    }

    return json({ success: true, scheduled_post_id: schedId });
  } catch (err: any) {
    console.error('[phyllo-publish-post] error:', err);
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
