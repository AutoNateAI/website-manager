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
    console.log('Function started - checking environment variables:');
    console.log('PHYLLO_CLIENT_ID exists:', !!PHYLLO_CLIENT_ID);
    console.log('PHYLLO_CLIENT_SECRET exists:', !!PHYLLO_CLIENT_SECRET);
    console.log('PHYLLO_ENVIRONMENT:', PHYLLO_ENVIRONMENT);
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = await req.json().catch(() => ({}));
    console.log('Request body:', JSON.stringify(body, null, 2));
    const action = body?.action as string | undefined;

    if (!action) {
      console.error('Missing action in request body');
      return json({ error: 'Missing action' }, 400);
    }
    
    console.log('Action requested:', action);

    switch (action) {
      case 'create_connect_token': {
        if (!PHYLLO_CLIENT_ID || !PHYLLO_CLIENT_SECRET) {
          return json({ error: 'PHYLLO credentials not configured' }, 500);
        }

        try {
          const { phyllo_user_id, name, external_id } = body || {};
          const env = (PHYLLO_ENVIRONMENT || 'sandbox').toLowerCase();
          let apiBase: string;
          switch (env) {
            case 'sandbox':
              apiBase = 'https://api.sandbox.getphyllo.com';
              break;
            case 'staging':
            case 'development':
              apiBase = 'https://api.staging.getphyllo.com';
              break;
            case 'prod':
            case 'production':
            case 'live':
              apiBase = 'https://api.getphyllo.com';
              break;
            default:
              apiBase = 'https://api.sandbox.getphyllo.com';
          }

          const basicAuth = `Basic ${btoa(`${PHYLLO_CLIENT_ID}:${PHYLLO_CLIENT_SECRET}`)}`;

          // 1) Ensure a Phyllo user exists (create if not provided)
          let userId = phyllo_user_id as string | undefined;
          if (!userId) {
            const userPayload = {
              name: name || 'AutoNate User',
              external_id: external_id || crypto.randomUUID(),
            };

            const createUserResp = await fetch(`${apiBase}/v1/users`, {
              method: 'POST',
              headers: {
                Authorization: basicAuth,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userPayload),
            });

            if (!createUserResp.ok) {
              const errText = await createUserResp.text();
              console.error('Phyllo create user failed:', errText);
              return json({ error: 'Failed to create Phyllo user' }, 500);
            }

            const createdUser = await createUserResp.json();
            userId = createdUser?.id;
          }

          if (!userId) {
            return json({ error: 'Unable to determine phyllo_user_id' }, 500);
          }

          // 2) Create SDK token for that user
          const tokenResp = await fetch(`${apiBase}/v1/sdk-tokens`, {
            method: 'POST',
            headers: {
              Authorization: basicAuth,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userId,
              products: ['IDENTITY', 'ENGAGEMENT', 'PUBLISH.CONTENT'],
            }),
          });

          if (!tokenResp.ok) {
            const errorText = await tokenResp.text();
            console.error('Phyllo token creation failed:', errorText);
            return json({ error: 'Failed to create connect token' }, 500);
          }

          const tokenData = await tokenResp.json();
          console.log('Token created successfully:', { user_id: userId, token_exists: !!tokenData.sdk_token });
          
          // For Web Connect, use proper environment-specific URL and include required parameters
          const connectUrl = `https://connect.getphyllo.com/?environment=${env}&token=${tokenData.sdk_token}&redirect_uri=${encodeURIComponent('https://connect.getphyllo.com/success')}&product=IDENTITY,ENGAGEMENT,PUBLISH.CONTENT`;
          return json({ connectUrl, phyllo_user_id: userId });
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
