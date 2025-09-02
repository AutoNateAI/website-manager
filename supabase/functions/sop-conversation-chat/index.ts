import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an SOP Strategy Assistant.
Your job is to interview the user to capture everything needed to draft a clear, complete Standard Operating Procedure.

Guidelines:
- Ask ONE focused question at a time; be concise and practical.
- Keep answers brief (2–5 sentences) unless the user asks for detail.
- Progressively gather: purpose, scope, prerequisites, roles, tools, step-by-step process, decision points, edge cases, quality checks, time/cadence, and outputs.
- When details are vague, propose concrete options to choose from.
- Regularly summarize what we have and what's missing.
- When enough info is gathered (≈2–4 turns), suggest next steps: Extract Structured Data or Create SOP using a template.
- Never invent facts; always confirm assumptions with the user.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages = [], systemPrompt } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('Missing OPENAI_API_KEY');
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: systemPrompt || SYSTEM_PROMPT },
        ...messages,
      ],
      max_completion_tokens: 600,
    } as const;

    console.log('Calling OpenAI with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('OpenAI error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'OpenAI error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || 'I'm here. What process would you like to document?';
    
    // Log if we got a blank response to help debug
    if (!data.choices?.[0]?.message?.content?.trim()) {
      console.error('OpenAI returned blank/empty response - using fallback');
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sop-conversation-chat error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});