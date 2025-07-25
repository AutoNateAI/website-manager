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
    const { blogContent, blogTitle } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!blogContent) {
      throw new Error('Blog content is required');
    }

    console.log('Analyzing blog for image opportunities:', blogTitle);

    const prompt = `Analyze this blog post and suggest where images would enhance the content. For each suggested image location, provide:
1. A descriptive prompt for generating the image
2. The section/heading where it should be placed
3. A brief explanation of why an image would help here

Blog Title: ${blogTitle}

Blog Content:
${blogContent}

Please respond with a JSON array of image suggestions in this format:
[
  {
    "prompt": "A detailed image prompt for AI generation",
    "section": "The heading or section title where this image should go",
    "position": "after_heading", 
    "title": "Short title for the image",
    "alt_text": "Alt text for accessibility",
    "reason": "Brief explanation of why this image helps"
  }
]

Focus on:
- Key concepts that would benefit from visual explanation
- Section breaks that need visual interest
- Technical concepts that could use diagrams or illustrations
- Emotional moments that could use evocative imagery

Limit to 3-5 high-impact image suggestions.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert content strategist who understands how to enhance written content with strategic image placement. Always respond with valid JSON only.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze blog content');
    }

    const content = data.choices[0].message.content;
    
    // Parse the JSON response, handling markdown code blocks
    let imageSuggestions;
    try {
      // Remove markdown code block wrapper if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(7, -3).trim();
      } else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(3, -3).trim();
      }
      
      imageSuggestions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse image suggestions from AI response');
    }

    console.log(`Generated ${imageSuggestions.length} image suggestions for blog`);

    return new Response(JSON.stringify({
      success: true,
      suggestions: imageSuggestions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-blog-for-images function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to analyze blog content' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});