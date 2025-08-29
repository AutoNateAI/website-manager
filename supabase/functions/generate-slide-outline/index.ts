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
    const { 
      title, 
      description, 
      target_audience, 
      topic, 
      presentation_style, 
      slide_count, 
      insights 
    } = await req.json();

    console.log('Generating slide outline for:', title);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Create a comprehensive slide outline for a presentation with the following details:

Title: ${title}
Description: ${description || 'Not specified'}
Target Audience: ${target_audience}
Topic: ${topic}
Presentation Style: ${presentation_style}
Number of Slides: ${slide_count}
Additional Insights: ${insights || 'None provided'}

Please create a detailed slide outline that includes:
1. A compelling title slide
2. An agenda/overview slide
3. ${slide_count - 3} main content slides that flow logically
4. A conclusion/next steps slide

For each slide, provide:
- Slide number
- Title
- 3-5 key bullet points for content
- Brief speaker notes suggestion

The presentation should be engaging, professional, and tailored for ${target_audience}. 
Use a ${presentation_style} tone throughout.
Make sure the flow is logical and builds understanding progressively.

Return the response as a JSON array with this structure:
[
  {
    "slide_number": 1,
    "title": "Slide Title",
    "content_points": ["Point 1", "Point 2", "Point 3"],
    "speaker_notes": "Brief notes for the speaker"
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
            content: 'You are an expert presentation designer and educator who creates engaging, well-structured slide presentations. Always return valid JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate slide outline');
    }

    const data = await response.json();
    const outlineText = data.choices[0].message.content;

    // Try to parse as JSON, fallback to text if needed
    let outline;
    try {
      outline = JSON.parse(outlineText);
    } catch {
      // If JSON parsing fails, create a structured response
      outline = [{
        slide_number: 1,
        title: "Generated Outline",
        content_points: ["Content generated successfully"],
        speaker_notes: outlineText.substring(0, 500)
      }];
    }

    console.log('Slide outline generated successfully');

    return new Response(JSON.stringify({
      outline,
      prompt_used: prompt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-slide-outline function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate slide outline' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});