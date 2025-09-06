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
    const { researchBrief, category, targetLength, notebookUrl, chatgptUrl } = await req.json();

    console.log('Generating research blogs for:', { category, targetLength });

    // Step 1: Generate 3 research-based blog directions
    const directionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
...
        max_tokens: 1000
      }),
    });

    if (!directionsResponse.ok) {
      throw new Error(`OpenAI API error: ${directionsResponse.status}`);
    }

    const directionsData = await directionsResponse.json();
    let directions;

    console.log('OpenAI research directions response:', directionsData);

    if (!directionsData.choices || !directionsData.choices[0] || !directionsData.choices[0].message) {
      throw new Error('Invalid OpenAI response structure for directions');
    }

    const rawDirections = directionsData.choices[0].message.content;
    console.log('Raw research directions content:', rawDirections);

    try {
      const clean = rawDirections.replace(/```json\n?|\n?```/g, '').trim();
      directions = JSON.parse(clean);
    } catch (e) {
      console.error('Failed to parse directions JSON:', rawDirections);
      console.error('Parse error:', e);
      throw new Error('Failed to parse blog directions from AI response');
    }

    if (!Array.isArray(directions) || directions.length !== 3) {
      throw new Error('Expected exactly 3 blog directions from AI');
    }

    // Step 2: Generate full content for each direction
    const blogs = [];
    
    for (let i = 0; i < directions.length; i++) {
      const direction = directions[i];
      
      const contentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          messages: [
...
          max_tokens: 3500
        }),
      });

      if (!contentResponse.ok) {
        throw new Error(`OpenAI API error for blog ${i + 1}: ${contentResponse.status}`);
      }

      const contentData = await contentResponse.json();
      let blogContent;
      
      try {
        const rawContent = contentData.choices?.[0]?.message?.content ?? '';
        console.log(`Raw research blog content ${i + 1}:`, rawContent);
        const clean = rawContent.replace(/```json\n?|\n?```/g, '').trim();
        if (!clean) throw new Error('Empty content from OpenAI');
        blogContent = JSON.parse(clean);
      } catch (e) {
        console.error(`Failed to parse blog content JSON for blog ${i + 1}:`, contentData.choices?.[0]?.message?.content);
        console.error('Parse error:', e);
        throw new Error(`Failed to parse blog content for blog ${i + 1}`);
      }

      blogs.push({
        ...blogContent,
        published: false,
        featured: false
      });
    }

    return new Response(JSON.stringify({ 
      blogs,
      metadata: {
        researchBrief,
        category,
        targetLength,
        notebookUrl,
        chatgptUrl,
        generationType: 'research'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-research-blogs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});