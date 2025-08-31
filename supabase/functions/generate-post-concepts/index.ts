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
      mediaType,
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
      sourceContent, platform, style, voice, title, mediaType || 'evergreen', contextDirection
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
  mediaType: string,
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

  let prompt = '';
  
  if (mediaType === 'company') {
    prompt = `Create 3 distinct ${platform} ${style} carousel concepts with a ${voice.toLowerCase()} voice targeting COMPANIES about AI command centers and automation solutions.

Title: ${title}
Source Content:
${contentSummary}${contextText}

Context: You're teaching companies how AI command centers can transform their business operations. Focus on practical implementation, ROI, efficiency gains, and competitive advantages. Speak directly to decision-makers who need to understand the value proposition.

Create 3 different approaches:

POST 1: Implementation-focused
- Target audience: CTOs, IT Directors, Operations Managers
- Angle: Step-by-step guide to implementing AI command centers in their specific industry
- Tone: Technical but accessible, solution-oriented

POST 2: ROI & Business Value focus
- Target audience: C-Suite executives, Business owners, Financial decision-makers  
- Angle: Cost savings, efficiency gains, competitive advantages of AI automation
- Tone: Data-driven, strategic, results-focused

POST 3: Industry-specific transformation
- Target audience: Industry leaders in their specific vertical
- Angle: How AI command centers are revolutionizing their particular industry
- Tone: Visionary, forward-thinking, industry-expert

Each concept should:
- Address real business pain points and solutions
- Include specific AI automation capabilities and benefits
- Provide actionable insights they can implement
- Position your AI command center expertise naturally
- Include a clear business-focused call-to-action`;
  } else if (mediaType === 'advertisement') {
    prompt = `Create 3 distinct ${platform} ${style} carousel concepts with a ${voice.toLowerCase()} voice for ADVERTISING your AI command center products and services.

Title: ${title}
Source Content:
${contentSummary}${contextText}

Context: You're showcasing your AI command center capabilities, demonstrating what you can build, and converting prospects into clients. Focus on your expertise, proven results, and unique AI solutions.

Create 3 different approaches:

POST 1: Capability showcase
- Target audience: Potential clients needing AI solutions
- Angle: Demonstrate the power and versatility of your AI command centers
- Tone: Confident, expert, results-driven

POST 2: Success story/Case study focus
- Target audience: Decision-makers evaluating AI solutions
- Angle: Real examples of successful AI command center implementations
- Tone: Trustworthy, proven, outcome-focused

POST 3: Behind-the-scenes/Process focus
- Target audience: Technical stakeholders and curious prospects
- Angle: How you build custom AI solutions and command centers
- Tone: Transparent, technical expertise, craftsmanship

Each concept should:
- Highlight your unique AI command center expertise
- Include specific capabilities and technologies you offer
- Show tangible results and benefits
- Build trust and credibility
- End with a strong call-to-action for consultation/demo`;
  } else {
    // Evergreen content
    prompt = `Create 3 distinct ${platform} ${style} educational carousel concepts with a ${voice.toLowerCase()} voice for EVERGREEN community content.

Title: ${title}
Source Content:
${contentSummary}${contextText}

Context: You're an expert researcher and educator sharing valuable insights about AI, automation, and technology trends. Focus on educating the community, sharing research-backed insights, and establishing thought leadership.

Create 3 different approaches:

POST 1: Educational/Tutorial focus
- Target audience: AI/tech enthusiasts wanting to learn
- Angle: Break down complex AI concepts into digestible insights
- Tone: Educational, researcher-like, accessible

POST 2: Industry trends/Research focus
- Target audience: Professionals staying current with AI developments
- Angle: Latest research, trends, and implications for the industry
- Tone: Analytical, authoritative, research-based

POST 3: Practical insights/Applications focus
- Target audience: Practitioners looking for actionable knowledge
- Angle: Real-world applications and practical implications of AI research
- Tone: Practical, insightful, community-focused

Each concept should:
- Provide genuine educational value to the community
- Be backed by research or solid expertise
- Encourage learning and discussion
- Share insights without being promotional
- Include a community-building call-to-action`;
  }

  prompt += `

Return in JSON format:
{
  "concepts": [
    {
      "id": "concept-1",
      "title": "Compelling hook/title for post 1",
      "angle": "Detailed description of the approach and why this angle works",
      "targetAudience": "Specific description of who this targets",
      "keyMessages": ["message 1", "message 2", "message 3"],
      "tone": "Appropriate tone for this concept",
      "callToAction": "Specific CTA for this audience"
    },
    {
      "id": "concept-2", 
      "title": "Compelling hook/title for post 2",
      "angle": "Detailed description of the approach and why this angle works",
      "targetAudience": "Specific description of who this targets", 
      "keyMessages": ["message 1", "message 2", "message 3"],
      "tone": "Appropriate tone for this concept",
      "callToAction": "Specific CTA for this audience"
    },
    {
      "id": "concept-3",
      "title": "Compelling hook/title for post 3", 
      "angle": "Detailed description of the approach and why this angle works",
      "targetAudience": "Specific description of who this targets",
      "keyMessages": ["message 1", "message 2", "message 3"], 
      "tone": "Appropriate tone for this concept",
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