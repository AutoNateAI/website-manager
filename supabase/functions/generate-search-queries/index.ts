import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, context = {} } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get existing search queries for context
    const { data: existingQueries } = await supabase
      .from('search_queries')
      .select('title, description, parameters, location_filters, hashtag_filters')
      .limit(10);

    const systemPrompt = `You are an advanced Instagram market intelligence assistant. Generate sophisticated search queries for discovering high-value posts and accounts.

Focus on these key areas:
1. Location-based targeting for businesses doing 70-80% marketing via Instagram
2. Entity searches (business names, venues, organizations)
3. Engagement quality filters (>30 comments, >55% real commenters)
4. Cross-platform validation signals
5. Authenticity indicators (active posting, real engagement)

Return a JSON object with this structure:
{
  "title": "Descriptive query title",
  "description": "What this query is designed to find",
  "parameters": {
    "keywords": ["keyword1", "keyword2"],
    "topics": ["topic1", "topic2"],
    "business_types": ["type1", "type2"]
  },
  "location_filters": [
    {"type": "city", "value": "New York", "radius": "25mi"},
    {"type": "zip", "value": "10001"}
  ],
  "hashtag_filters": ["#hashtag1", "#hashtag2"],
  "engagement_thresholds": {
    "min_comments": 30,
    "min_likes": 100,
    "real_commenter_ratio": 0.55,
    "min_monthly_posts": 1,
    "min_total_posts": 12
  }
}

Context from existing queries: ${JSON.stringify(existingQueries)}`;

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
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to generate search query');
    }

    const generatedContent = data.choices[0].message.content;
    let searchQuery;
    
    try {
      // Extract JSON from the response
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        searchQuery = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse generated search query:', parseError);
      throw new Error('Failed to parse generated search query');
    }

    console.log('Generated search query:', searchQuery);

    return new Response(JSON.stringify({ searchQuery }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-search-queries function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});