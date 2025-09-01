import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) throw new Error('OPENAI_API_KEY not configured');

    const { postId, concept, platform, style, voice } = await req.json();
    if (!postId) {
      return new Response(JSON.stringify({ error: 'postId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = new Response(JSON.stringify({ success: true, message: 'Post processing started', postId }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Run the heavy work in background so this function returns fast
    EdgeRuntime.waitUntil(processPost({ supabase, openAIApiKey, postId, concept, platform, style, voice }));

    return res;
  } catch (error) {
    console.error('process-social-post error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processPost({ supabase, openAIApiKey, postId, concept, platform, style, voice }: any) {
  console.log(`[process-social-post] Start for post ${postId}`);

  // 1) Load post + source items
  const { data: post, error: postErr } = await supabase
    .from('social_media_posts')
    .select('id, status, source_items')
    .eq('id', postId)
    .single();

  if (postErr) throw postErr;
  if (post?.status === 'cancelled') {
    console.log(`[process-social-post] Post ${postId} already cancelled. Exiting.`);
    return;
  }

  // 2) Fetch source content for prompts
  const sourceContent = await fetchSourceContent(supabase, post?.source_items || []);

  try {
    // 3) Generate caption + image prompts in parallel
    console.log(`[process-social-post] Generating caption & prompts for ${postId}`);

    await supabase
      .from('social_media_posts')
      .update({
        status: 'generating_caption',
        generation_progress: {
          step: 'generating_caption',
          started_at: new Date().toISOString(),
        },
      })
      .eq('id', postId);

    const [captionData, imagePrompts] = await Promise.all([
      generateCaptionAndHashtags(openAIApiKey, sourceContent, concept, platform, style, voice),
      generateImagePrompts(openAIApiKey, sourceContent, concept, platform, style, voice, { caption: concept?.title || '' }),
    ]);

    // 4) Update caption + switch to image generation state
    await supabase
      .from('social_media_posts')
      .update({
        caption: captionData.caption,
        hashtags: captionData.hashtags,
        status: 'generating_images',
        generation_progress: {
          step: 'generating_images',
          images_total: 9,
          images_completed: 0,
          failed_images: [],
          started_at: new Date().toISOString(),
        },
      })
      .eq('id', postId);

    // 5) Fan out per-image generation via dedicated Edge Function (non-blocking)
    try {
      const invokePromises = imagePrompts.map((p, idx) =>
        supabase.functions.invoke('generate-social-image', {
          body: {
            postId,
            carouselIndex: 1,
            imageIndex: idx + 1,
            prompt: p.prompt,
            alt_text: p.alt_text,
          },
        }).then(({ error }) => {
          if (error) console.error('[process-social-post] invoke generate-social-image error:', error);
        }).catch((e) => console.error('[process-social-post] invoke fetch error:', e))
      );
      await Promise.all(invokePromises);
      console.log(`[process-social-post] Dispatched ${imagePrompts.length} image jobs for ${postId}`);
    } catch (e) {
      console.error('[process-social-post] Error dispatching image jobs:', e);
    }

    // Image workers will update progress and finalize completion when all 9 images are present.

  } catch (err) {
    console.error(`[process-social-post] Error for ${postId}:`, err);
    await supabase
      .from('social_media_posts')
      .update({
        status: 'failed',
        generation_progress: {
          step: 'failed',
          error: err.message || 'Unknown error',
          failed_at: new Date().toISOString(),
        },
      })
      .eq('id', postId);
  }
}

// ===== Helpers (duplicated here intentionally for function isolation) =====
function parseJSONSafe(text: string) {
  let t = String(text ?? '').trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\n?/i, '').replace(/```$/i, '').trim();
  }
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

async function fetchSourceContent(supabase: any, sourceItems: Array<{ type: 'blog' | 'live_build' | 'ad'; id: string }> = []) {
  const contentStrings: string[] = [];
  for (const item of sourceItems) {
    if (item.type === 'blog') {
      const { data } = await supabase
        .from('blogs')
        .select('title, excerpt, content, category')
        .eq('id', item.id)
        .single();
      if (data) contentStrings.push(`BLOG: ${data.title}\nCategory: ${data.category}\nExcerpt: ${data.excerpt}\nContent: ${data.content}`);
    } else if (item.type === 'live_build') {
      const { data } = await supabase
        .from('live_builds')
        .select('title, description, short_description, content')
        .eq('id', item.id)
        .single();
      if (data) contentStrings.push(`LIVE BUILD: ${data.title}\nDescription: ${data.description}\nContent: ${data.content || data.short_description}`);
    } else if (item.type === 'ad') {
      const { data } = await supabase
        .from('advertisements')
        .select('title, alt_text')
        .eq('id', item.id)
        .single();
      if (data) contentStrings.push(`ADVERTISEMENT: ${data.title}\nDescription: ${data.alt_text}`);
    }
  }
  return contentStrings.join('\n\n');
}

async function generateCaptionAndHashtags(
  openAIApiKey: string,
  sourceContent: string,
  concept: any,
  platform: string,
  style: string,
  voice: string
): Promise<{ caption: string; hashtags: string[] }> {
  console.log(`[process-social-post] Generating caption`);

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  // Get template from database - NO FALLBACK
  const { data: templateData, error: templateError } = await supabase
    .from('prompt_templates')
    .select('template')
    .eq('type', 'caption')
    .eq('platform', platform)
    .eq('is_default', true)
    .single();

  if (templateError || !templateData?.template) {
    console.error('PROMPT_TEMPLATE_NOT_FOUND:', templateError);
    throw new Error(`PROMPT_TEMPLATE_NOT_FOUND: No caption template found for platform=${platform}. Please check your prompt_templates table.`);
  }

  const template = templateData.template;
  
  let prompt = template
    .replace(/\{\{platform\}\}/g, platform)
    .replace(/\{\{style\}\}/g, style)
    .replace(/\{\{voice\}\}/g, voice)
    .replace(/\{\{concept\}\}/g, JSON.stringify(concept));

  if (sourceContent) {
    prompt = prompt.replace(/\{\{#if source_content\}\}(.*?)\{\{\/if\}\}/gs, '$1').replace(/\{\{source_content\}\}/g, sourceContent);
  } else {
    prompt = prompt.replace(/\{\{#if source_content\}\}(.*?)\{\{\/if\}\}/gs, '');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert social media content creator. Always return valid JSON.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[process-social-post] OpenAI caption error:', errorData);
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = parseJSONSafe(data.choices?.[0]?.message?.content ?? '{}');
  return { caption: result.caption || 'Generated caption', hashtags: result.hashtags || [] };
}

async function generateImagePrompts(
  openAIApiKey: string,
  sourceContent: string,
  concept: any,
  platform: string,
  style: string,
  voice: string,
  captionData: any
): Promise<Array<{ prompt: string; alt_text: string }>> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  // Get template from database - NO FALLBACK
  const { data: templateData, error: templateError } = await supabase
    .from('prompt_templates')
    .select('template')
    .eq('type', 'image_prompts')
    .eq('platform', platform)
    .eq('is_default', true)
    .single();

  if (templateError || !templateData?.template) {
    console.error('PROMPT_TEMPLATE_NOT_FOUND:', templateError);
    throw new Error(`PROMPT_TEMPLATE_NOT_FOUND: No image_prompts template found for platform=${platform}. Please check your prompt_templates table.`);
  }

  const template = templateData.template;
  
  let prompt = template
    .replace(/\{\{platform\}\}/g, platform)
    .replace(/\{\{style\}\}/g, style)
    .replace(/\{\{voice\}\}/g, voice)
    .replace(/\{\{concept\}\}/g, JSON.stringify(concept));

  if (sourceContent) {
    prompt = prompt.replace(/\{\{#if source_content\}\}(.*?)\{\{\/if\}\}/gs, '$1').replace(/\{\{source_content\}\}/g, sourceContent);
  } else {
    prompt = prompt.replace(/\{\{#if source_content\}\}(.*?)\{\{\/if\}\}/gs, '');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You create compelling narrative-driven image prompts for carousels. Always return valid JSON.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[process-social-post] OpenAI prompts error:', errorData);
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = parseJSONSafe(data.choices?.[0]?.message?.content ?? '{}');

  // Ensure exactly 9 prompts - NO FALLBACK GENERATION
  let images = Array.isArray(result.images) ? result.images : [];
  images = images
    .map((it: any) => ({ prompt: String(it?.prompt ?? '').trim(), alt_text: String(it?.alt_text ?? '').trim() }))
    .filter((it: any) => it.prompt.length > 0);

  if (images.length !== 9) {
    console.error('INCOMPLETE_IMAGE_PROMPTS:', { received: images.length, expected: 9 });
    throw new Error(`INCOMPLETE_IMAGE_PROMPTS: Expected 9 image prompts but got ${images.length}. Check your image_prompts template and OpenAI response.`);
  }
  
  return images;
}

async function generateImageCarousel(
  supabase: any,
  openAIApiKey: string,
  postId: string,
  carouselIndex: number,
  captionData: any,
  concept: any,
  platform: string,
  style: string,
  voice: string,
  sourceContent: string,
  imagePrompts: Array<{ prompt: string; alt_text: string }>
): Promise<number> {
  console.log(`[process-social-post] Generating 9 images for ${postId}`);

  const imageTasks = imagePrompts.map(async (p, i) => {
    const imageIndex = i + 1;
    for (let retry = 0; retry < 3; retry++) {
      try {
        const { data: postCheck } = await supabase
          .from('social_media_posts')
          .select('status')
          .eq('id', postId)
          .single();
        if (postCheck?.status === 'cancelled') return { success: false, cancelled: true };

        const imageUrl = await generateImage(supabase, openAIApiKey, p.prompt);

        await supabase.from('social_media_images').insert({
          post_id: postId,
          carousel_index: carouselIndex,
          image_index: imageIndex,
          image_url: imageUrl,
          image_prompt: p.prompt,
          alt_text: p.alt_text,
        });

        const { error: rpcError } = await supabase.rpc('increment_image_progress', {
          post_id_param: postId,
          carousel_index_param: imageIndex,
        });
        if (rpcError) {
          // Fallback progress update
          const { data: cur } = await supabase
            .from('social_media_posts')
            .select('generation_progress')
            .eq('id', postId)
            .single();
          const current = cur?.generation_progress?.images_completed || 0;
          await supabase
            .from('social_media_posts')
            .update({ generation_progress: { ...cur?.generation_progress, images_completed: current + 1, last_completed_image: imageIndex, updated_at: new Date().toISOString(), step: 'generating_images' } })
            .eq('id', postId);
        }

        console.log(`[process-social-post] Completed image ${imageIndex}/9 for ${postId}`);
        return { success: true };
      } catch (err) {
        if (retry === 2) {
          // record failure
          const { data: cur } = await supabase
            .from('social_media_posts')
            .select('generation_progress')
            .eq('id', postId)
            .single();
          const failed = cur?.generation_progress?.failed_images || [];
          await supabase
            .from('social_media_posts')
            .update({ generation_progress: { ...cur?.generation_progress, failed_images: [...failed, imageIndex] } })
            .eq('id', postId);
          return { success: false };
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, retry) * 1000));
      }
    }
  });

  const results = await Promise.all(imageTasks);
  return results.filter((r) => r?.success).length;
}

async function generateImage(
  supabase: any,
  openAIApiKey: string,
  prompt: string,
  referenceImageUrl?: string,
  options?: { size?: string; quality?: 'high' | 'standard' }
): Promise<string> {
  const size = options?.size ?? '1024x1024';
  const quality = options?.quality ?? 'high';

  const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size, quality, output_format: 'png' }),
  });

  if (!imageResponse.ok) {
    const errorData = await imageResponse.json();
    console.error('[process-social-post] OpenAI image error:', errorData);
    throw new Error(errorData.error?.message || `Image generation failed: ${imageResponse.status}`);
  }

  const imageData = await imageResponse.json();
  const base64Image = imageData.data[0].b64_json;
  const imageBuffer = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));

  const fileName = `social-media-${crypto.randomUUID()}-${Date.now()}.png`;
  const { error: uploadError } = await supabase.storage.from('generated-images').upload(fileName, imageBuffer, { contentType: 'image/png' });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(fileName);
  return urlData.publicUrl;
}

async function recoverMissingImages(
  supabase: any,
  openAIApiKey: string,
  postId: string,
  carouselIndex: number,
  imagePrompts: Array<{ prompt: string; alt_text: string }>,
  missingIndices: number[]
): Promise<number> {
  let recovered = 0;
  for (const imageIndex of missingIndices) {
    // Skip if already exists (race safety)
    const { data: exists } = await supabase
      .from('social_media_images')
      .select('id')
      .eq('post_id', postId)
      .eq('carousel_index', carouselIndex)
      .eq('image_index', imageIndex)
      .limit(1);
    if (Array.isArray(exists) && exists.length > 0) continue;

    const promptObj = imagePrompts[imageIndex - 1] || { prompt: `Recovery slide ${imageIndex}`, alt_text: `Slide ${imageIndex}` };
    for (let retry = 0; retry < 3; retry++) {
      try {
        // Cancellation check
        const { data: postCheck } = await supabase
          .from('social_media_posts')
          .select('status')
          .eq('id', postId)
          .single();
        if (postCheck?.status === 'cancelled') {
          console.log(`[process-social-post] Recovery cancelled at image ${imageIndex}`);
          return recovered;
        }

        const imageUrl = await generateImage(supabase, openAIApiKey, promptObj.prompt, undefined, { quality: 'standard' });

        await supabase.from('social_media_images').insert({
          post_id: postId,
          carousel_index: carouselIndex,
          image_index: imageIndex,
          image_url: imageUrl,
          image_prompt: promptObj.prompt,
          alt_text: promptObj.alt_text,
        });

        const { error: rpcError } = await supabase.rpc('increment_image_progress', {
          post_id_param: postId,
          carousel_index_param: imageIndex,
        });
        if (rpcError) {
          const { data: cur } = await supabase
            .from('social_media_posts')
            .select('generation_progress')
            .eq('id', postId)
            .single();
          const current = cur?.generation_progress?.images_completed || 0;
          await supabase
            .from('social_media_posts')
            .update({ generation_progress: { ...cur?.generation_progress, images_completed: current + 1, last_completed_image: imageIndex, updated_at: new Date().toISOString(), step: 'generating_images' } })
            .eq('id', postId);
        }

        console.log(`[process-social-post] Recovery succeeded for image ${imageIndex}`);
        recovered++;
        break;
      } catch (err) {
        console.error(`[process-social-post] Recovery error for image ${imageIndex} (attempt ${retry + 1}):`, err);
        if (retry < 2) {
          await new Promise((r) => setTimeout(r, Math.pow(2, retry) * 1000));
        }
      }
    }
  }
  return recovered;
}

function postIdSafe() {
  // just for filename uniqueness with time ordering
  return `${Date.now()}`;
}
