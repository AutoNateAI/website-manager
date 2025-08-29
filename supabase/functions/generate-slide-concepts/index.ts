import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

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
    const { deck_id, slides } = await req.json();

    console.log('Generating core concepts for deck:', deck_id);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Combine all slide content
    const allContent = slides.map(slide => `Slide ${slide.slide_number}: ${slide.title}\n${slide.content}`).join('\n\n');

    const prompt = `Based on this presentation content, identify the 5-8 most important core concepts that should be understood and remembered. These will be used as flashcards for review.

Content:
${allContent}

For each core concept, provide:
1. A concise title (3-6 words)
2. A clear, memorable description (2-3 sentences)
3. Importance level (1-5, where 5 is most critical)
4. Which slide numbers relate to this concept

Focus on:
- Key principles and frameworks
- Important definitions
- Critical insights
- Actionable takeaways
- Foundational knowledge

Return as JSON array:
[
  {
    "title": "Concept Title",
    "description": "Clear, memorable explanation of the concept...",
    "importance": 4,
    "related_slides": [1, 3, 5]
  }
]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert educator who excels at distilling complex information into key concepts for learning and retention. Always return valid JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate core concepts');
    }

    const data = await response.json();
    let concepts;
    
    try {
      concepts = JSON.parse(data.choices[0].message.content);
    } catch {
      console.error('Failed to parse concepts JSON');
      concepts = [];
    }

    // Insert concepts into database
    const insertedConcepts = [];
    for (const concept of concepts) {
      const { data: insertedConcept, error } = await supabase
        .from('core_concepts')
        .insert({
          deck_id,
          concept_title: concept.title,
          concept_description: concept.description,
          importance_level: concept.importance || 3,
          related_slide_numbers: concept.related_slides || []
        })
        .select()
        .single();

      if (!error) {
        insertedConcepts.push(insertedConcept);
      }
    }

    console.log(`Generated ${insertedConcepts.length} core concepts`);

    return new Response(JSON.stringify({
      concepts: insertedConcepts,
      message: `Successfully generated ${insertedConcepts.length} core concepts`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-slide-concepts function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate core concepts' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});