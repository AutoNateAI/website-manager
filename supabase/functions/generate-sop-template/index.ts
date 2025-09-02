import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { conversationId, messages, title, category } = body as {
      conversationId?: string;
      messages?: Message[];
      title: string;
      category?: string;
    };

    if (!title) {
      return new Response(JSON.stringify({ error: 'title is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let convoMessages: Message[] = messages || [];
    if (conversationId) {
      const { data, error } = await supabase
        .from('sop_conversations')
        .select('conversation_data')
        .eq('id', conversationId)
        .maybeSingle();
      if (error) throw error;
      if (data?.conversation_data) convoMessages = data.conversation_data as Message[];
    }

    const convoText = (convoMessages || [])
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    const systemPrompt = `You create high-quality SOP templates. Output strict JSON with:
{
  "title": string,
  "description": string,
  "category": string,
  "sections": [{"id": string, "title": string, "required": boolean, "order": number, "guidance"?: string}],
  "screenshot_placeholders": [{"section": string, "description": string}],
  "formatting_rules": {"tone"?: string, "style"?: string}
}`;

    const userPrompt = `Create an SOP template based on this discussion. Cater to category: ${category || 'general'}.\n\nConversation context:\n${convoText}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 1200,
      }),
    });

    const ai = await response.json();
    if (!response.ok) {
      console.error('OpenAI API error:', ai);
      throw new Error(ai.error?.message || 'Failed to generate template');
    }

    const content = ai.choices?.[0]?.message?.content || '';

    let parsed: any = null;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    } catch (_e) {}

    const tpl = parsed || {
      title,
      description: `Template generated from discussion`,
      category: category || 'general',
      sections: [
        { id: 'overview', title: 'Overview', required: true, order: 1 },
        { id: 'steps', title: 'Steps', required: true, order: 2 },
      ],
      screenshot_placeholders: [],
      formatting_rules: {},
    };

    // Ensure title set to provided title to avoid duplicates
    tpl.title = title;

    const { data: inserted, error: insErr } = await supabase
      .from('sop_templates')
      .insert({
        title: tpl.title,
        description: tpl.description,
        category: tpl.category || category || 'general',
        sections: tpl.sections,
        screenshot_placeholders: tpl.screenshot_placeholders || [],
        template_structure: { type: tpl.category || 'general', format: 'structured' },
        formatting_rules: tpl.formatting_rules || {},
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('Insert template error:', insErr);
      throw insErr;
    }

    return new Response(JSON.stringify({ ok: true, templateId: inserted.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in generate-sop-template function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
