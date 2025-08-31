import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SourceItem {
  type: 'blog' | 'live_build' | 'ad';
  id: string;
  title: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      title,
      platform,
      style,
      voice,
      sourceItems,
      contextDirection
    } = await req.json();

    console.log('Starting post concept generation');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize optional source items (can be empty)
    const normalizedSourceItems = Array.isArray(sourceItems) ? sourceItems : [];

    // Fetch source content details
    const sourceContent = await fetchSourceContent(supabase, normalizedSourceItems);
    
    // Generate 3 distinct post concepts
    const concepts = await generatePostConcepts(
      sourceContent, platform, style, voice, title, contextDirection
    );

    console.log('Post concept generation completed');

    return new Response(JSON.stringify({
      success: true,
      concepts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-post-concepts function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate post concepts' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Robust JSON parser to handle code fences or extra text
function parseJSONSafe(text: string) {
  let t = String(text ?? '').trim();
  // Remove Markdown code fences if present
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\n?/i, '').replace(/```$/i, '').trim();
  }
  // Extract the first JSON object/array if extra prose exists
  const firstBrace = t.indexOf('{');
  const lastBrace = t.lastIndexOf('}');
  const firstBracket = t.indexOf('[');
  const lastBracket = t.lastIndexOf(']');
  if (firstBrace !== -1 && lastBrace !== -1 && (firstBrace < firstBracket || firstBracket === -1)) {
    t = t.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    t = t.slice(firstBracket, lastBracket + 1);
  }
  return JSON.parse(t);
}

async function fetchSourceContent(supabase: any, sourceItems: SourceItem[] = []) {
  const content = [];
  
  for (const item of sourceItems) {
    if (item.type === 'blog') {
      const { data } = await supabase
        .from('blogs')
        .select('title, excerpt, content, category')
        .eq('id', item.id)
        .single();
      if (data) content.push({ type: 'blog', ...data });
    } else if (item.type === 'live_build') {
      const { data } = await supabase
        .from('live_builds')
        .select('title, description, short_description, content')
        .eq('id', item.id)
        .single();
      if (data) content.push({ type: 'live_build', ...data });
    } else if (item.type === 'ad') {
      const { data } = await supabase
        .from('advertisements')
        .select('title, alt_text')
        .eq('id', item.id)
        .single();
      if (data) content.push({ type: 'ad', ...data });
    }
  }
  
  return content;
}

async function generatePostConcepts(
  sourceContent: any[], 
  platform: string, 
  style: string, 
  voice: string,
  title: string,
  contextDirection?: string
) {
  const contentSummary = sourceContent.map(item => {
    if (item.type === 'blog') {
      return `Blog: ${item.title} - ${item.excerpt}\nCategory: ${item.category}`;
    } else if (item.type === 'live_build') {
      return `Live Build: ${item.title} - ${item.description}`;
    } else {
      return `Ad: ${item.title}`;
    }
  }).join('\n\n');

  const contextText = contextDirection ? `\n\nAdditional Context: ${contextDirection}` : '';

  const prompt = `Analyze the source content and create 3 distinct post concepts for ${platform} ${style} posts with a ${voice.toLowerCase()} voice.

Title: ${title}
Source Content:
${contentSummary}${contextText}

Create 3 completely different approaches to the same source material:

POST 1: Educational/How-to focus
- Target audience: Beginners or those wanting to learn
- Angle: Break down complex concepts into digestible steps
- Tone: Helpful, encouraging, accessible

POST 2: Strategic/Thought Leadership focus  
- Target audience: Professionals and decision-makers
- Angle: Industry insights, trends, and strategic implications
- Tone: Authoritative, analytical, forward-thinking

POST 3: Inspirational/Story-driven focus
- Target audience: Broader audience seeking motivation
- Angle: Personal journey, transformation, or behind-the-scenes
- Tone: Motivational, relatable, engaging

Each concept should:
- Be genuinely different in approach and target audience
- Leverage the source content from a unique angle
- Include specific key messages that would resonate with that audience
- Have a clear call-to-action relevant to that audience segment
- Build energy and encourage sharing/engagement

Return in JSON format:
{
  "concepts": [
    {
      "id": "concept-1",
      "title": "Compelling hook/title for post 1",
      "angle": "Detailed description of the approach and why this angle works",
      "targetAudience": "Specific description of who this targets",
      "keyMessages": ["message 1", "message 2", "message 3"],
      "tone": "Educational",
      "callToAction": "Specific CTA for this audience"
    },
    {
      "id": "concept-2", 
      "title": "Compelling hook/title for post 2",
      "angle": "Detailed description of the approach and why this angle works",
      "targetAudience": "Specific description of who this targets", 
      "keyMessages": ["message 1", "message 2", "message 3"],
      "tone": "Strategic",
      "callToAction": "Specific CTA for this audience"
    },
    {
      "id": "concept-3",
      "title": "Compelling hook/title for post 3", 
      "angle": "Detailed description of the approach and why this angle works",
      "targetAudience": "Specific description of who this targets",
      "keyMessages": ["message 1", "message 2", "message 3"], 
      "tone": "Inspirational",
      "callToAction": "Specific CTA for this audience"
    }
  ]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        { role: 'system', content: 'You are an expert social media strategist who creates viral, engaging content concepts that target different audience segments effectively.' },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 2000
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('OpenAI error:', data);
    throw new Error(data.error?.message || 'Failed to generate concepts');
  }
  const result = parseJSONSafe(data.choices?.[0]?.message?.content ?? '{}');
  
  return result.concepts;
}