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
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert research analyst and content strategist who creates data-driven, research-backed blog content. You excel at turning research findings, case studies, and analytical insights into compelling, evidence-based blog posts.'
          },
          {
            role: 'user',
            content: `Based on this research brief, create 3 unique research-backed blog post directions for the category: "${category}".

Research Brief:
${researchBrief}

Each direction should be research-focused, data-driven, and provide analytical insights. Include references to studies, case studies, or research findings where relevant.

IMPORTANT: Respond with ONLY a valid JSON array. Do not include backticks or any extra text.
Each array item must be an object with exactly these keys: title, direction, key_findings (array), research_approach, target_audience.`
          }
        ],
        max_completion_tokens: 2000
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
          model: 'gpt-5-2025-08-07',
          messages: [
            {
              role: 'system',
              content: `You are an expert research writer who creates data-driven, evidence-based blog posts. Your content should be analytical, well-researched, and backed by credible insights.

Write in a professional, authoritative tone while remaining accessible. Use data, statistics, case studies, and research findings to support your points. Include proper headings, bullet points, and clear structure.

The target length is ${targetLength} words. Focus on original analysis, research synthesis, and actionable insights based on evidence.`
            },
            {
              role: 'user',
              content: `Create a comprehensive research-based blog post based on this direction and the original research brief:

Research Brief Context:
${researchBrief}

Blog Direction:
Title: ${direction.title}
Direction: ${direction.direction}
Key Findings to Cover: ${direction.key_findings.join(', ')}
Research Approach: ${direction.research_approach}
Target Audience: ${direction.target_audience}
Category: ${category}
Target Length: ${targetLength} words

Return your response as a JSON object with:
- title: The final blog title
- excerpt: A compelling 2-3 sentence summary highlighting key research insights (max 160 characters)
- content: The full blog post content in markdown format with proper headings, data points, and research-backed conclusions
- category: "${category}"
- author: "AutoNate"
- read_time: Estimated read time based on word count
- slug: URL-friendly slug
- imageSuggestions: Array of 3-4 objects with {title, prompt, alt_text, position} for charts, graphs, or visual research representations

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any markdown formatting, backticks, or other text. Just the raw JSON.

Make the content research-focused, data-driven, and provide original analytical insights based on the research brief.`
            }
          ],
          max_completion_tokens: 4000
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