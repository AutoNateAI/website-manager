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
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are AutoNateAI's strategic content architect. Based on company research briefs, you create 3 distinct blog directions that showcase how custom AI-integrated software can transform businesses.

Target Audience: SMB owners, foundation leaders, community organization leaders, VCs, and startup leaders.

AutoNateAI Identity:
- The bridge between critical thinking and intelligent software
- We solve complex problems with custom AI-integrated solutions
- We use critical thinking frameworks, graph theory, and prompt engineering
- We build transparently using Lovable.dev
- We offer: Workflow Automation, AI Copilots, Intelligent Dashboards, Cross-tool Integrations, Custom Software Builds

Your task: Create 3 unique blog directions that each offer different value propositions, ensuring readers don't feel like they're reading the same content three times. Each direction should:
1. Address different aspects of the company's challenges/opportunities
2. Showcase different AutoNateAI solutions
3. Use distinct angles and metaphors
4. Speak authoritatively to business leaders with relevant industry insights`
          },
          {
            role: 'user',
            content: `Based on this company research brief: "${companyBrief}"

Create 3 unique blog directions for the ${category} category. For each direction, provide:
1. Title (compelling and specific)
2. Core angle (what unique perspective/value this blog offers)
3. Key AutoNateAI solutions to highlight
4. Primary metaphor/framework to use
5. Target business pain point addressed

IMPORTANT: Respond with ONLY a valid JSON array. Do not include backticks or any extra text.
Each array item must be an object with exactly these keys: title, angle, solutions (array), metaphor, painPoint.`
          }
        ],
        max_completion_tokens: 1500,
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
          model: 'gpt-5-2025-08-07',
          messages: [
            {
              role: 'system',
              content: `You are AutoNateAI's senior content strategist writing for business leaders. Create authoritative, insightful blog content that demonstrates deep industry understanding while naturally showcasing how AutoNateAI's custom AI-integrated software solves complex business problems.

Writing Style:
- Authoritative yet conversational tone
- Rich, relevant metaphors that resonate with business leaders
- Deep, nuanced insights that demonstrate expertise  
- Strategic perspective that positions AI as a business multiplier
- Professional but engaging voice that builds trust

AutoNateAI Solutions Context:
- Workflow Automation: Saves time, reduces costs, unlocks opportunities
- AI Copilots: Industry-tailored intelligent assistants
- Intelligent Dashboards: Data platforms with predictive insights
- Cross-tool Integrations: Seamless ecosystem connections
- Custom Software Builds: AI-infused throughout the workflow

Target Audience: SMB owners, foundation leaders, community organizations, VCs, startup leaders who need:
- Strategic advantage through intelligent software
- Operational efficiency and cost reduction
- Data-driven decision making capabilities
- Competitive differentiation through AI integration

Content Structure: Use markdown with proper headings (#, ##, ###), bullet points, and strategic image placement suggestions.`
            },
            {
              role: 'user',
              content: `Company Research Brief: "${companyBrief}"

Blog Direction: ${JSON.stringify(direction)}

Category: ${category}
Target Length: ${targetLength} words

Write a comprehensive, authoritative blog post that:
1. Opens with a compelling hook using the specified metaphor/framework
2. Addresses the target pain point with deep industry insight
3. Naturally weaves in how AutoNateAI's solutions solve these challenges
4. Uses rich, relevant metaphors throughout
5. Provides actionable insights that demonstrate expertise
6. Concludes with a strategic call-to-action

Include [IMAGE SUGGESTION: description] markers for 3-5 strategic image placements.

Make this content uniquely valuable - not generic advice, but specific insights that position AutoNateAI as the strategic partner for intelligent software solutions.`
            }
          ],
          max_completion_tokens: 3000,
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