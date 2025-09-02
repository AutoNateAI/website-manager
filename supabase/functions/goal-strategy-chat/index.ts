import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a Goal Strategy Assistant specializing in campaign planning and SOP strategy linking.

Your job is to help users:
1. Build comprehensive goal breakdowns and campaign overviews
2. Identify which Standard Operating Procedures (SOPs) should be linked as strategies
3. Create actionable campaign strategies that track efforts effectively

Guidelines:
- Ask focused questions about campaign objectives, target outcomes, and strategic approaches
- When discussing strategies, suggest specific SOPs that could be linked to achieve the goal
- Keep responses practical and strategic (3-5 sentences)
- Progressively gather: goal purpose, target metrics, timeline, required strategies (SOPs), resource needs, and success criteria
- When mentioning SOPs, be specific about which ones would work best for the campaign goals
- After 3-4 exchanges, provide a summary and suggest moving to form completion
- Focus on linking concrete strategies (SOPs) to measurable campaign outcomes

Available SOPs will be provided in context when relevant.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages = [], systemPrompt, campaignId, availableSOPs = [] } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('Missing OPENAI_API_KEY');
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build context about available SOPs
    const sopContext = availableSOPs.length > 0 
      ? `\n\nAvailable SOPs to link as strategies:\n${availableSOPs.map((sop: any) => 
          `- ${sop.title} (${sop.category}): ${sop.description}`
        ).join('\n')}`
      : '\n\nNo SOPs are currently available to link as strategies.';

    const enhancedSystemPrompt = (systemPrompt || SYSTEM_PROMPT) + sopContext;

    const payload = {
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: enhancedSystemPrompt },
        ...messages,
      ],
      max_completion_tokens: 600,
    } as const;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'OpenAI error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reply = data.choices?.[0]?.message?.content ?? 'I\'m here to help you build effective campaign strategies. What goal would you like to work on?';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('goal-strategy-chat error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});