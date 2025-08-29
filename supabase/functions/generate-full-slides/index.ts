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
    const { deck_id, outline, presentation_style } = await req.json();

    console.log('Generating full slides for deck:', deck_id);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const generatedSlides = [];

    for (const slideOutline of outline) {
      const prompt = `You are a professional professor who has been teaching for decades. You're known for using excellent metaphors, nuanced explanations, and making complex concepts accessible. 

Create detailed content for this slide:

Slide ${slideOutline.slide_number}: ${slideOutline.title}
Key Points: ${slideOutline.content_points?.join(', ')}
Speaker Notes Context: ${slideOutline.speaker_notes}

Please create:

1. DETAILED SLIDE CONTENT (2-3 paragraphs): 
   - Introduce the concept clearly
   - Provide context and real-world connections
   - Show the importance and how it connects to other concepts
   - Use metaphors or analogies where appropriate
   - Make it engaging and memorable

2. COMPREHENSIVE SPEAKER NOTES (3-4 paragraphs):
   - Detailed talking points for each section
   - Stories or examples to illustrate concepts
   - Transition suggestions to the next slide
   - Key emphasis points

3. IMAGE GENERATION PROMPT:
   - A detailed prompt for generating a 16:9 professional image
   - Should be metaphorical/conceptual rather than literal
   - Focus on visual elements that enhance understanding
   - Professional, modern, and visually appealing style

Style: ${presentation_style}

Return as JSON:
{
  "content": "The detailed slide content...",
  "speaker_notes": "Comprehensive speaker notes...",
  "image_prompt": "Detailed image generation prompt..."
}`;

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
              content: 'You are an expert educator and presentation designer. Always return valid JSON format.' 
            },
            { role: 'user', content: prompt }
          ],
          max_completion_tokens: 1500,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error for slide:', slideOutline.slide_number);
        continue;
      }

      const data = await response.json();
      let slideData;
      
      try {
        slideData = JSON.parse(data.choices[0].message.content);
      } catch {
        slideData = {
          content: data.choices[0].message.content,
          speaker_notes: "Generated content available",
          image_prompt: `Professional 16:9 image for ${slideOutline.title}`
        };
      }

      // Insert slide into database
      const { data: insertedSlide, error } = await supabase
        .from('slides')
        .insert({
          deck_id,
          slide_number: slideOutline.slide_number,
          title: slideOutline.title,
          content: slideData.content,
          speaker_notes: slideData.speaker_notes,
          image_prompt: slideData.image_prompt,
          layout_type: slideOutline.slide_number === 1 ? 'title-content' : 'title-content'
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        continue;
      }

      generatedSlides.push(insertedSlide);
      
      console.log(`Generated slide ${slideOutline.slide_number}/${outline.length}`);
    }

    // Update deck status to generated
    await supabase
      .from('slide_decks')
      .update({ status: 'generated' })
      .eq('id', deck_id);

    console.log('Full slide generation completed');

    return new Response(JSON.stringify({
      slides: generatedSlides,
      message: `Successfully generated ${generatedSlides.length} slides`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-full-slides function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate full slides' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});