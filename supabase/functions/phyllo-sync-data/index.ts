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
    const { account_id } = await req.json();
    if (!account_id) return json({ error: 'account_id required' }, 400);

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { error } = await supabase
      .from('instagram_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', account_id);
    if (error) throw error;

    // Placeholder for fetching data from Phyllo APIs
    return json({ success: true });
  } catch (err: any) {
    console.error('[phyllo-sync-data] error:', err);
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
