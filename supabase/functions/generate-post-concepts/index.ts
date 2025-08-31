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

    console.log('Starting post concept generation with mediaType:', mediaType);
    console.log('Request data:', { title, platform, style, voice, mediaType });

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
  try {
    return JSON.parse(t);
  } catch (e) {
    console.error('JSON parse failed, returning empty object. Raw text start:', t.slice(0, 200));
    return {} as any;
  }
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

Context: You're educating decision-makers at companies about how AI command centers can solve their operational challenges and drive measurable business results. Focus on ROI, efficiency, and competitive advantage. Position AI automation as the solution to their pain points.

Create 3 different conversion-focused approaches:

POST 1: Problem-Solution Implementation
- Target audience: CTOs, IT Directors, Operations Managers seeking solutions
- Angle: "Here's the exact business problem you're facing and how AI command centers solve it step-by-step"
- Tone: Authoritative problem-solver, solution-oriented
- Focus: Pain point identification → AI solution → implementation roadmap

POST 2: ROI & Competitive Advantage
- Target audience: C-Suite executives, Business owners, Financial decision-makers
- Angle: "Your competitors are gaining unfair advantages with AI automation - here's how you can leapfrog them"
- Tone: Urgent, data-driven, results-focused
- Focus: Market reality → competitive gap → AI solution → measurable outcomes

POST 3: Industry Transformation Success
- Target audience: Industry leaders worried about being left behind
- Angle: "Leading companies in your industry are already using AI command centers - here's what they're achieving"
- Tone: Insider knowledge, forward-thinking, FOMO-inducing
- Focus: Industry examples → transformation results → implementation opportunity

Each concept should:
- Start with a painful business challenge they recognize immediately
- Position AI command centers as the proven solution
- Include specific ROI metrics and efficiency gains
- Create urgency around competitive disadvantage of inaction
- End with a compelling business consultation call-to-action`;
  } else if (mediaType === 'advertisement') {
    prompt = `Create 3 distinct ${platform} ${style} carousel concepts with a ${voice.toLowerCase()} voice for ADVERTISING your AI command center services with high conversion focus.

Title: ${title}
Source Content:
${contentSummary}${contextText}

Context: You're showcasing your proven AI command center expertise to convert prospects into paying clients. Emphasize unique capabilities, successful implementations, and exclusive access to your services. Create desire and urgency.

Create 3 different high-conversion approaches:

POST 1: Exclusive Capability Showcase
- Target audience: Decision-makers ready to invest in AI solutions
- Angle: "See the advanced AI capabilities most companies can't access - here's what we build for our clients"
- Tone: Exclusive, high-value, expert authority
- Focus: Unique technology → exclusive access → limited availability

POST 2: Client Success Transformation
- Target audience: Prospects evaluating AI solution providers
- Angle: "How we transformed [industry] operations with custom AI - detailed case study and results"
- Tone: Proven results, trustworthy, outcome-focused
- Focus: Client challenge → custom solution → measurable transformation → availability

POST 3: Behind-the-Scenes Expertise
- Target audience: Technical decision-makers and procurement teams
- Angle: "Inside look at how we engineer custom AI solutions - methodology and expertise you won't find elsewhere"
- Tone: Technical authority, transparent process, craftsmanship
- Focus: Process expertise → quality standards → custom approach → consultation offer

Each concept should:
- Demonstrate unique value proposition and differentiation
- Include specific client results and capabilities
- Create exclusivity and premium positioning
- Build immediate trust and credibility
- End with strong conversion CTA (consultation, demo, strategy session)`;
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

  console.log('Generated prompt:', prompt.substring(0, 200) + '...');
  
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
      response_format: { type: 'json_object' },
      max_completion_tokens: 2000
    }),
  });
  
  console.log('OpenAI response status:', response.status);

  const data = await response.json();
  if (!response.ok) {
    console.error('OpenAI error:', data);
    throw new Error(data.error?.message || 'Failed to generate concepts');
  }
  
  console.log('OpenAI response content length:', data.choices?.[0]?.message?.content?.length);
  const content = data.choices?.[0]?.message?.content ?? '{}';
  let result = parseJSONSafe(content);
  console.log('Parsed result:', result);

  if (!result || !Array.isArray(result.concepts)) {
    console.warn('LLM did not return valid concepts JSON, building fallback concepts');
    const tones = mediaType === 'company' ? ['Authoritative', 'Strategic', 'Visionary']
      : mediaType === 'advertisement' ? ['Confident', 'Trustworthy', 'Expert']
      : ['Educational', 'Analytical', 'Practical'];
    result = {
      concepts: [1, 2, 3].map((n, idx) => ({
        id: `concept-${n}`,
        title: `${title} — ${mediaType === 'advertisement' ? 'Showcase' : mediaType === 'company' ? 'Business Impact' : 'Insight'} ${n}`,
        angle: mediaType === 'company' ? 'Problem → AI Command Center Solution → ROI'
          : mediaType === 'advertisement' ? 'Capability → Proof → CTA'
          : 'Explain → Example → Takeaway',
        targetAudience: mediaType === 'company' ? 'Decision-makers at growth-oriented companies'
          : mediaType === 'advertisement' ? 'Prospective clients evaluating AI services'
          : 'AI/tech community',
        keyMessages: ['Clear hook', '3-5 concrete points', 'Strong CTA'],
        tone: tones[idx] || 'Professional',
        callToAction: mediaType === 'advertisement' ? 'Book a demo'
          : mediaType === 'company' ? 'Schedule a consultation'
          : 'Join the discussion'
      }))
    } as any;
  }
  
  return result.concepts;
}