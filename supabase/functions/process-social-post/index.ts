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

    // 5) Generate images (9 in parallel with retries + progress)
    const successCount = await generateImageCarousel(supabase, openAIApiKey, postId, 1, captionData, concept, platform, style, voice, sourceContent, imagePrompts);

    // 6) Completion with recovery pass for any missing indices
    let finalCount = successCount;

    if (finalCount < 9) {
      // Determine which indices are missing
      const { data: existingImgs } = await supabase
        .from('social_media_images')
        .select('image_index')
        .eq('post_id', postId)
        .eq('carousel_index', 1);
      const present = new Set<number>((existingImgs || []).map((r: any) => r.image_index));
      const missingIndices = Array.from({ length: 9 }, (_, i) => i + 1).filter((i) => !present.has(i));

      console.log(`[process-social-post] Recovery: missing indices for ${postId}: ${missingIndices.join(', ') || 'none'}`);

      // Sequential recovery to reduce CPU pressure
      const recovered = await recoverMissingImages(supabase, openAIApiKey, postId, 1, imagePrompts, missingIndices);
      finalCount = present.size + recovered;
    }

    // 7) Finalize status strictly when all 9 images exist
    if (finalCount === 9) {
      await supabase
        .from('social_media_posts')
        .update({
          status: 'completed',
          generation_progress: {
            step: 'completed',
            images_total: 9,
            images_completed: 9,
            completed_at: new Date().toISOString(),
          },
        })
        .eq('id', postId);

      console.log(`[process-social-post] Finished ${postId} with 9/9 images`);
    } else {
      // Compute final failed list for clarity
      const { data: finalImgs } = await supabase
        .from('social_media_images')
        .select('image_index')
        .eq('post_id', postId)
        .eq('carousel_index', 1);
      const present = new Set<number>((finalImgs || []).map((r: any) => r.image_index));
      const failedImages = Array.from({ length: 9 }, (_, i) => i + 1).filter((i) => !present.has(i));

      await supabase
        .from('social_media_posts')
        .update({
          status: 'failed',
          generation_progress: {
            step: 'failed',
            images_total: 9,
            images_completed: present.size,
            failed_images: failedImages,
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', postId);

      console.log(`[process-social-post] ${postId} incomplete after recovery: ${present.size}/9 images`);
    }
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

  const prompt = `Create an engaging ${platform} ${style} post using a ${voice?.toLowerCase()} voice based on this concept:\n\nTitle/Hook: ${concept?.title}\nTarget Audience: ${concept?.targetAudience}\nContent Angle: ${concept?.angle}\nKey Messages: ${(concept?.keyMessages || []).join(', ')}\nCall to Action: ${concept?.callToAction}\n\n${sourceContent ? `Source Content:\n${sourceContent}\n` : ''}\n\nCreate:\n1. A compelling caption (optimized for ${platform})\n2. 8-15 relevant hashtags\n\nReturn in JSON format:\n{\n  "caption": "engaging caption text",\n  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]\n}`;

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
  const prompt = `Create 9 animated visual story slides for ${platform} that tell a cohesive narrative. Each image MUST be consistently ANIMATED/ILLUSTRATED style with bold text overlays that advance the story.\n\nSTORY CONCEPT:\nTitle: ${concept?.title}\nTarget Audience: ${concept?.targetAudience}\nContent Angle: ${concept?.angle}\nKey Messages: ${(concept?.keyMessages || []).join(', ')}\nCaption: ${captionData?.caption}\n\n${sourceContent ? `Source Content:\n${sourceContent}\n` : ''}\n\nCRITICAL STORY STRUCTURE - Each slide builds on the previous:\nSlide 1 (SCROLL STOPPER): Bold animated illustration with attention-grabbing hook text overlay.\nSlide 2: Animated illustration showing emotional pain/frustration.\nSlide 3: \"Aha moment\" animated illustration introducing solution.\nSlide 4: Positive outcomes/benefits.\nSlide 5: Process/how-it-works diagram.\nSlide 6: Before/after comparison.\nSlide 7: Social proof.\nSlide 8: Urgency/desire building.\nSlide 9 (STRONG CTA): Clear next-step call-to-action.\n\nVISUAL REQUIREMENTS:\n- Consistent animated/illustrated style\n- Bold, readable text overlays\n- High contrast colors\n- Mobile-optimized composition\n\nReturn JSON: { "images": [{ "prompt": "...", "alt_text": "..." }] }`;

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

  // Ensure exactly 9 prompts
  let images = Array.isArray(result.images) ? result.images : [];
  images = images
    .map((it: any) => ({ prompt: String(it?.prompt ?? '').trim(), alt_text: String(it?.alt_text ?? '').trim() }))
    .filter((it: any) => it.prompt.length > 0);

  if (images.length > 9) {
    images = images.slice(0, 9);
  }
  if (images.length < 9) {
    const base = concept?.title || 'Social media carousel';
    for (let i = images.length; i < 9; i++) {
      images.push({
        prompt: `${base} — Slide ${i + 1}. Consistent animated/illustrated style, bold readable text overlay, high contrast, mobile-first composition.`,
        alt_text: `Slide ${i + 1} — ${base}`,
      });
    }
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

  const fileName = `social-media-${postIdSafe()}-${crypto.randomUUID()}.png`;
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
