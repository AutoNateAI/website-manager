import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    console.log('Generating product content for prompt:', prompt);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert product marketing copywriter. Generate compelling product content based on the user's description. 

Return a JSON object with the following structure:
{
  "title": "Product title (max 100 characters)",
  "tagline": "Short catchy tagline (max 60 characters)",
  "description": "Detailed product description (200-500 words)",
  "price": "Pricing information (e.g., '$99/month', 'Free', 'Contact for pricing')",
  "features": ["Feature 1", "Feature 2", "Feature 3", ...] (array of 5-8 key features),
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3", ...] (array of 5-8 key benefits)
}

Focus on:
- Clear, compelling copy that sells
- Benefits over features where possible
- Professional but engaging tone
- Specific, actionable features
- Value proposition clarity

Make the content persuasive and professional.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to generate content');
    }

    let content;
    try {
      content = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', data.choices[0].message.content);
      throw new Error('Failed to parse AI response');
    }

    console.log('Generated product content successfully');

    return new Response(JSON.stringify({
      content,
      prompt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-product-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate product content' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});