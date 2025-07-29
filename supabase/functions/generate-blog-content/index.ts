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
    const { topic, category, targetLength } = await req.json();

    console.log('Generating blog content for:', { topic, category, targetLength });

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
            content: `You are an expert blog writer for AutoNateAI. Create engaging, well-structured blog content in markdown format that subtly leads readers to see how AutoNateAI's services can help them. Use proper headings (# ## ###), include bullet points, and write in a conversational but professional tone. The content should be SEO-friendly and valuable to readers.

AutoNateAI Services Context:
DIGITAL PRODUCTS: AI Grant Drafting Assistant ($149), Lit Review AI ($129), Cloud Data Pipeline Builder ($129)
COACHING: AI Research Workflow Optimization ($299), Grant Strategy & Review ($499), Literature Review Acceleration ($349), Team Workflow Implementation ($1,499)
WORKSHOPS: AI Grant Writing Mastery, Literature Review Revolution, Research Data Pipeline Implementation, Custom AI Research Workflow Design
TARGET: Graduate students, postdocs, faculty, research teams, academic departments, research institutes

Make the content genuine and valuable while naturally highlighting how AutoNateAI's AI-powered workflows, coaching, and training can solve the problems discussed.`
          },
          {
            role: 'user',
            content: `Write a comprehensive blog post about "${topic}" in the ${category} category. The post should be approximately ${targetLength} words long. Include:
            
            1. An engaging title (using # heading)
            2. A compelling introduction
            3. Multiple sections with ## headings
            4. Subheadings with ### where appropriate
            5. Bullet points and numbered lists where relevant
            6. A conclusion
            7. Suggest 3-5 good spots where images would enhance the content (mention [IMAGE SUGGESTION: description] in the markdown)
            
            Make sure the content is informative, engaging, and properly formatted in markdown.`
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to generate content');
    }

    const content = data.choices[0].message.content;

    // Extract title from the first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : topic;

    // Generate excerpt from first paragraph
    const lines = content.split('\n').filter(line => line.trim());
    const firstParagraph = lines.find(line => !line.startsWith('#') && line.trim().length > 50);
    const excerpt = firstParagraph ? firstParagraph.substring(0, 200) + '...' : '';

    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Find image suggestions
    const imageSuggestions = [];
    const imageMatches = content.match(/\[IMAGE SUGGESTION: ([^\]]+)\]/g);
    if (imageMatches) {
      imageMatches.forEach((match, index) => {
        const description = match.replace(/\[IMAGE SUGGESTION: ([^\]]+)\]/, '$1');
        imageSuggestions.push({
          id: `img_${index + 1}`,
          description,
          placeholder: `![${description}](image-placeholder-${index + 1})`
        });
      });
    }

    console.log('Generated blog content successfully');

    return new Response(JSON.stringify({
      title,
      content,
      excerpt,
      slug,
      category,
      imageSuggestions,
      readTime: `${Math.ceil(content.split(' ').length / 200)} min read`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-blog-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate blog content' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});