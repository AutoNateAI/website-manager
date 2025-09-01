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
      mediaType,
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
      sourceContent, platform, style, voice, title, mediaType, contextDirection
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
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get template from database - NO FALLBACK
  const { data: templateData, error: templateError } = await supabase
    .from('prompt_templates')
    .select('template')
    .eq('type', 'concept')
    .eq('platform', platform)
    .eq('media_type', mediaType)
    .eq('is_default', true)
    .single();

  if (templateError || !templateData?.template) {
    console.error('PROMPT_TEMPLATE_NOT_FOUND:', templateError);
    throw new Error(`PROMPT_TEMPLATE_NOT_FOUND: No concept template found for platform=${platform}, media_type=${mediaType}. Please check your prompt_templates table.`);
  }

  const template = templateData.template;
  
  // Simple template variable replacement
  const contentSummary = sourceContent.map(item => {
    if (item.type === 'blog') {
      return `Blog: ${item.title} - ${item.excerpt}\nCategory: ${item.category}`;
    } else if (item.type === 'live_build') {
      return `Live Build: ${item.title} - ${item.description}`;
    } else {
      return `Ad: ${item.title}`;
    }
  }).join('\n\n');

  let prompt = template
    .replace(/\{\{platform\}\}/g, platform)
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{style\}\}/g, style)
    .replace(/\{\{voice\}\}/g, voice)
    .replace(/\{\{media_type\}\}/g, mediaType);

  if (contextDirection) {
    prompt = prompt
      .replace(/\{\{#if context_direction\}\}(.*?)\{\{\/if\}\}/gs, '$1')
      .replace(/\{\{context_direction\}\}/g, contextDirection);
  } else {
    prompt = prompt.replace(/\{\{#if context_direction\}\}(.*?)\{\{\/if\}\}/gs, '');
  }

  if (contentSummary) {
    prompt = prompt
      .replace(/\{\{#if source_content\}\}(.*?)\{\{\/if\}\}/gs, '$1')
      .replace(/\{\{source_content\}\}/g, contentSummary);
  } else {
    prompt = prompt.replace(/\{\{#if source_content\}\}(.*?)\{\{\/if\}\}/gs, '');
  }

  // Safe debug logging: preview prompt and any unreplaced tokens (max 10 shown)
  const unreplaced = (prompt.match(/\{\{[^}]+\}\}/g) || [])
    .filter(v => !v.startsWith('{{#') && !v.startsWith('{{/'))
    .slice(0, 10);
  console.log('[generate-post-concepts] concept prompt preview', {
    platform,
    style,
    voice,
    mediaType,
    sourceItemsCount: sourceContent.length,
    hasContextDirection: Boolean(contextDirection),
    unreplacedTokens: unreplaced,
    preview: prompt.slice(0, 800),
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2000
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('OpenAI error:', data);
    throw new Error(data.error?.message || 'Failed to generate concepts');
  }
  const result = parseJSONSafe(data.choices?.[0]?.message?.content ?? '{}');

  // Safe debug logging: result summary (no full content)
  const first = Array.isArray(result?.concepts) ? result.concepts[0] : undefined;
  console.log('[generate-post-concepts] concepts result summary', {
    count: Array.isArray(result?.concepts) ? result.concepts.length : 0,
    firstKeys: first ? Object.keys(first).slice(0, 6) : [],
    firstTitle: first?.title || first?.hook || first?.heading,
  });
  
  return result.concepts;
}