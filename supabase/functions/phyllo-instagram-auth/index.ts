import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PHYLLO_CLIENT_ID = Deno.env.get('PHYLLO_CLIENT_ID');
const PHYLLO_CLIENT_SECRET = Deno.env.get('PHYLLO_CLIENT_SECRET');
const PHYLLO_ENVIRONMENT = Deno.env.get('PHYLLO_ENVIRONMENT') ?? 'sandbox';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (!action) {
      return json({ error: 'Missing action' }, 400);
    }

    switch (action) {
      case 'create_connect_token': {
        if (!PHYLLO_CLIENT_ID || !PHYLLO_CLIENT_SECRET) {
          return json({
            error: 'PHYLLO credentials not configured',
          }, 500);
        }

        // Create a proper Phyllo Connect token
        try {
          const tokenResponse = await fetch(`https://api.getphyllo.com/v1/sdk-tokens`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${PHYLLO_CLIENT_ID}:${PHYLLO_CLIENT_SECRET}`)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Instagram Account Connection',
              products: ['IDENTITY', 'ENGAGEMENT'],
              work_platforms: ['instagram'],
              expire_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            }),
          });

          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Phyllo token creation failed:', errorText);
            return json({ error: 'Failed to create connect token' }, 500);
          }

          const tokenData = await tokenResponse.json();
          const connectUrl = `https://connect.getphyllo.com/?env=${PHYLLO_ENVIRONMENT}&token=${tokenData.sdk_token}`;
          
          return json({ connectUrl });
        } catch (error) {
          console.error('Error creating Phyllo token:', error);
          return json({ error: 'Failed to create connect token' }, 500);
        }
      }

      case 'link_account': {
        const { phyllo_profile_id, phyllo_account_id, username } = body;
        if (!phyllo_profile_id || !phyllo_account_id || !username) {
          return json({ error: 'phyllo_profile_id, phyllo_account_id, username required' }, 400);
        }

        const { data, error } = await supabase
          .from('instagram_accounts')
          .insert({
            user_id: null,
            phyllo_profile_id,
            phyllo_account_id,
            username,
            access_status: 'connected',
          })
          .select('*')
          .maybeSingle();

        if (error) throw error;
        return json({ account: data });
      }

      case 'disconnect': {
        const { account_id } = body;
        if (!account_id) return json({ error: 'account_id required' }, 400);

        const { data, error } = await supabase
          .from('instagram_accounts')
          .update({ access_status: 'disconnected' })
          .eq('id', account_id)
          .select('*')
          .maybeSingle();

        if (error) throw error;
        return json({ account: data });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error('[phyllo-instagram-auth] error:', err);
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
