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
  
  // Find JSON boundaries
  const firstBrace = t.indexOf('{');
  const lastBrace = t.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in response');
  }
  
  // Extract JSON portion
  t = t.slice(firstBrace, lastBrace + 1);
  
  // Parse JSON
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
    prompt = `Create 3 COMPLETELY DIFFERENT ${platform} ${style} carousel concepts with a ${voice.toLowerCase()} voice targeting COMPANIES about AI command centers and automation solutions.

Title/Theme: ${title}
Source Content:
${contentSummary}${contextText}

CRITICAL: Each concept must be UNIQUE with different hooks, angles, and approaches. NO REPETITION.

POST 1: "The Hidden Cost Crisis" - Problem Amplification Approach
- Target audience: Finance leaders and cost-conscious executives
- Unique Hook: "Your manual processes are costing you $X per month in hidden expenses"
- Angle: Expose the hidden financial drain of manual operations → Show exact ROI calculations of AI automation
- Tone: Urgent, data-driven, financial impact focused
- Content Focus: Cost analysis, waste identification, precise savings calculations
- CTA: "Get your free operational cost audit"

POST 2: "The Competitive Intelligence Gap" - Market Positioning Approach  
- Target audience: Strategic leaders and business owners
- Unique Hook: "While you're stuck in manual mode, your competitors are scaling with AI"
- Angle: Competitive disadvantage story → Market intelligence on AI adoption → How to leapfrog competition
- Tone: Strategic urgency, insider knowledge, competitive advantage
- Content Focus: Market trends, competitor examples, strategic positioning
- CTA: "See how industry leaders are winning with AI"

POST 3: "The Operations Transformation Blueprint" - Success Story Approach
- Target audience: Operations managers and implementation teams
- Unique Hook: "[Industry] company reduced processing time by 90% with custom AI command center"
- Angle: Detailed case study → Step-by-step transformation process → Replicable results
- Tone: Proof-driven, process-focused, achievement-oriented  
- Content Focus: Real transformation story, methodology, measurable outcomes
- CTA: "Download the transformation blueprint"

Each concept MUST have:
- Completely different hook and title
- Unique angle and approach to the same topic
- Different target audience within companies
- Specific, actionable content direction
- Distinct call-to-action`;
  } else if (mediaType === 'advertisement') {
    prompt = `Create 3 COMPLETELY DIFFERENT ${platform} ${style} carousel concepts with a ${voice.toLowerCase()} voice for ADVERTISING your AI command center services.

Title/Theme: ${title}
Source Content:
${contentSummary}${contextText}

CRITICAL: Each concept must showcase DIFFERENT aspects of your expertise. NO REPETITION.

POST 1: "Exclusive Technology Showcase" - Capability Demonstration
- Target audience: Technical decision-makers and CTOs
- Unique Hook: "Inside look: The advanced AI stack we build for enterprise clients"
- Angle: Deep-dive into proprietary technology → Exclusive capabilities → Limited access positioning
- Tone: Technical authority, exclusive access, premium positioning
- Content Focus: Technology stack, advanced capabilities, enterprise-grade solutions
- CTA: "Request technical consultation"

POST 2: "Client Transformation Gallery" - Social Proof Approach
- Target audience: Business leaders evaluating providers
- Unique Hook: "How we transformed [Industry] operations: From chaos to command center"
- Angle: Before/after transformation stories → Client testimonials → Proven methodology
- Tone: Results-focused, trustworthy, transformation-driven
- Content Focus: Client success stories, transformation metrics, testimonials
- CTA: "See more success stories"

POST 3: "Behind the Build Process" - Methodology Showcase
- Target audience: Procurement teams and technical evaluators
- Unique Hook: "Why our 90-day AI implementation succeeds where others fail"
- Angle: Unique methodology → Quality process → Guaranteed outcomes approach
- Tone: Process-confident, quality-focused, guarantee-backed
- Content Focus: Implementation process, quality standards, success methodology  
- CTA: "Schedule implementation planning session"

Each concept MUST have:
- Different value proposition and positioning
- Unique aspect of your services highlighted
- Different proof points and credibility builders
- Specific target within prospect organizations
- Distinct conversion-focused CTA`;
  } else {
    // Evergreen content
    prompt = `Create 3 COMPLETELY DIFFERENT ${platform} ${style} educational carousel concepts with a ${voice.toLowerCase()} voice for EVERGREEN community content.

Title/Theme: ${title}
Source Content:
${contentSummary}${contextText}

CRITICAL: Each concept must approach AI/tech education from DIFFERENT angles. NO REPETITION.

POST 1: "The Research Deep-Dive" - Academic Researcher Approach
- Target audience: AI researchers, academics, and serious practitioners
- Unique Hook: "New research reveals [specific finding] about AI implementation"
- Angle: Latest research findings → Technical analysis → Implications for practice
- Tone: Academic authority, research-backed, analytically rigorous
- Content Focus: Research data, technical insights, peer-reviewed findings
- CTA: "Read the full research analysis"

POST 2: "The Practical Implementation Guide" - Hands-on Educator Approach
- Target audience: Developers and technical implementers
- Unique Hook: "Step-by-step: How to actually implement [AI concept] in production"
- Angle: Practical tutorial → Real-world challenges → Working solutions
- Tone: Practical mentor, implementation-focused, experience-based
- Content Focus: Code examples, implementation steps, troubleshooting tips
- CTA: "Get the implementation toolkit"

POST 3: "The Industry Impact Analysis" - Strategic Thinker Approach  
- Target audience: Business technologists and strategic planners
- Unique Hook: "Why [AI trend] will reshape [industry] in the next 2 years"
- Angle: Trend analysis → Strategic implications → Future predictions
- Tone: Strategic analyst, forward-thinking, trend-spotting
- Content Focus: Market analysis, strategic implications, future scenarios
- CTA: "Join the strategic discussion"

Each concept MUST have:
- Completely different educational angle and approach
- Unique hook related to the source material
- Different aspect of AI/tech knowledge shared
- Distinct target within the tech community  
- Different type of value provided (research/practical/strategic)`;
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
    console.error('OpenAI error response:', response.status, data);
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }
  
  console.log('OpenAI response content length:', data.choices?.[0]?.message?.content?.length);
  const content = data.choices?.[0]?.message?.content ?? '{}';
  console.log('Raw OpenAI content preview:', content.slice(0, 300));
  
  let result;
  try {
    result = parseJSONSafe(content);
    console.log('Parsed result keys:', Object.keys(result));
  } catch (parseError) {
    console.error('JSON parsing failed:', parseError);
    throw new Error('Failed to parse OpenAI response as JSON');
  }

  if (!result || !Array.isArray(result.concepts) || result.concepts.length !== 3) {
    console.error('Invalid result structure:', result);
    throw new Error('OpenAI did not return valid concepts array');
  }
  
  console.log('Successfully generated', result.concepts.length, 'concepts');
  return result.concepts;
}