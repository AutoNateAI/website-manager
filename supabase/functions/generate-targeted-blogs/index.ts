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
    const { companyBrief, category, targetLength, notebookUrl, chatgptUrl } = await req.json();

    console.log('Generating targeted blogs with company brief:', { category, targetLength, notebookUrl, chatgptUrl });

    // Step 1: Generate 3 unique blog directions based on the company brief
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

    const directionsData = await directionsResponse.json();

    console.log('OpenAI directions (targeted) raw:', directionsData);

    if (!directionsData.choices || !directionsData.choices[0] || !directionsData.choices[0].message) {
      throw new Error('Invalid OpenAI response structure for directions');
    }

    const rawDirections = directionsData.choices[0].message.content;
    console.log('Raw directions content (targeted):', rawDirections);

    if (!rawDirections || rawDirections.trim() === '') {
      throw new Error('Empty directions response from OpenAI');
    }

    let directions;
    try {
      const clean = rawDirections.replace(/```json\n?|\n?```/g, '').trim();
      directions = JSON.parse(clean);
    } catch (parseError) {
      console.error('Failed to parse directions JSON (targeted):', rawDirections);
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse blog directions');
    }

    if (!Array.isArray(directions) || directions.length !== 3) {
      throw new Error('Expected exactly 3 blog directions from AI');
    }
    const blogPromises = directions.map(async (direction: any, index: number) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          max_tokens: 3500,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('OpenAI API error (blog content):', data);
        throw new Error(data.error?.message || 'Failed to generate blog content');
      }

      const content = data.choices[0].message.content;

      // Extract title from the first # heading or use direction title
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : direction.title;

      // Generate excerpt from first meaningful paragraph
      const lines = content.split('\n').filter(line => line.trim());
      const firstParagraph = lines.find(line => !line.startsWith('#') && !line.startsWith('![') && line.trim().length > 50);
      const excerpt = firstParagraph ? firstParagraph.substring(0, 200) + '...' : '';

      // Generate slug from title
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Find image suggestions
      const imageSuggestions: any[] = [];
      const imageMatches = content.match(/\[IMAGE SUGGESTION: ([^\]]+)\]/g);
      if (imageMatches) {
        imageMatches.forEach((match, imgIndex) => {
          const description = match.replace(/\[IMAGE SUGGESTION: ([^\]]+)\]/, '$1');
          imageSuggestions.push({
            id: `img_${index}_${imgIndex + 1}`,
            prompt: `Professional business illustration: ${description}. Modern, clean design with vibrant colors. High-quality, engaging visual that complements business content.`,
            alt_text: description,
            title: `${title} - Image ${imgIndex + 1}`
          });
        });
      }

      return {
        title,
        content,
        excerpt,
        slug,
        category,
        author: 'AutoNate',
        read_time: `${Math.ceil(content.split(' ').length / 200)} min read`,
        imageSuggestions,
        published: false,
        featured: false,
        hero_image: '',
        hero_image_alt: ''
      };
    });

    const blogs = await Promise.all(blogPromises);

    console.log('Generated targeted blogs successfully:', blogs.length);

    return new Response(JSON.stringify({
      blogs,
      directions,
      sourceBrief: companyBrief,
      notebookUrl,
      chatgptUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-targeted-blogs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate targeted blogs' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});