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
    const { topic, category, targetLength, notebookUrl, chatgptUrl } = await req.json();

    console.log('Generating evergreen blogs for:', { topic, category, targetLength });

    // Step 1: Generate 3 evergreen blog directions
    const directionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content strategist who creates evergreen, timeless blog content that provides lasting value to readers. You understand that evergreen content should be educational, actionable, and relevant regardless of current trends or time.'
          },
          {
            role: 'user',
            content: `Create 3 unique evergreen blog post directions for the topic: "${topic}" in the category: "${category}".

Each direction should be timeless, educational, and provide lasting value. Avoid time-sensitive references, current events, or trending topics.

IMPORTANT: You must respond with ONLY a valid JSON array. Do not include any markdown formatting, backticks, or other text. Just the raw JSON.

Return a JSON array with exactly 3 objects, each containing:
- title: A compelling, evergreen title
- direction: A detailed description of the blog post direction and approach
- key_points: An array of 4-5 main points to cover
- target_audience: Who this content is for

Focus on foundational concepts, best practices, step-by-step guides, and educational content that will be valuable for years to come.`
          }
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 2000
      }),
    });

    if (!directionsResponse.ok) {
      throw new Error(`OpenAI API error: ${directionsResponse.status}`);
    }

    const directionsData = await directionsResponse.json();
    
    console.log('OpenAI directions response:', directionsData);
    
    if (!directionsData.choices || !directionsData.choices[0] || !directionsData.choices[0].message) {
      throw new Error('Invalid OpenAI response structure');
    }
    
    const rawContent = directionsData.choices[0].message.content;
    console.log('Raw directions content:', rawContent);
    
    if (!rawContent || rawContent.trim() === '') {
      throw new Error('Empty response from OpenAI');
    }
    
    let directions;
    try {
      // Clean the content in case it has markdown formatting
      const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      directions = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse directions JSON:', rawContent);
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
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            {
              role: 'system',
              content: `You are an expert content writer who creates evergreen, high-quality blog posts. Your content should be timeless, educational, and provide lasting value to readers.

Write in a professional yet engaging tone. Use clear headings, bullet points, and actionable advice. Avoid time-sensitive references or current events.

The target length is ${targetLength} words. Focus on depth, actionability, and educational value.`
            },
            {
              role: 'user',
              content: `Create a comprehensive evergreen blog post based on this direction:

Title: ${direction.title}
Direction: ${direction.direction}
Key Points to Cover: ${direction.key_points.join(', ')}
Target Audience: ${direction.target_audience}
Category: ${category}
Target Length: ${targetLength} words

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any markdown formatting, backticks, or other text. Just the raw JSON.

Return a JSON object with:
- title: The final blog title
- excerpt: A compelling 2-3 sentence summary (max 160 characters)
- content: The full blog post content in markdown format with proper headings
- category: "${category}"
- author: "AutoNate"
- read_time: Estimated read time based on word count
- slug: URL-friendly slug
- imageSuggestions: Array of 3-4 objects with {title, prompt, alt_text, position} for relevant images

Make the content evergreen, actionable, and valuable for the target audience.`
            }
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 4000
        }),
      });

      if (!contentResponse.ok) {
        throw new Error(`OpenAI API error for blog ${i + 1}: ${contentResponse.status}`);
      }

      const contentData = await contentResponse.json();
      
      console.log(`OpenAI blog content response ${i + 1}:`, contentData);
      
      if (!contentData.choices || !contentData.choices[0] || !contentData.choices[0].message) {
        throw new Error(`Invalid OpenAI response structure for blog ${i + 1}`);
      }
      
      const rawContent = contentData.choices[0].message.content;
      console.log(`Raw blog content ${i + 1}:`, rawContent);
      
      if (!rawContent || rawContent.trim() === '') {
        throw new Error(`Empty response from OpenAI for blog ${i + 1}`);
      }
      
      let blogContent;
      try {
        // Clean the content in case it has markdown formatting
        const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
        blogContent = JSON.parse(cleanContent);
      } catch (e) {
        console.error(`Failed to parse blog content JSON for blog ${i + 1}:`, rawContent);
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
        topic,
        category,
        targetLength,
        notebookUrl,
        chatgptUrl,
        generationType: 'evergreen'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-evergreen-blogs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});