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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) throw new Error('OPENAI_API_KEY not configured');
    if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error('Supabase env not configured');

    const { postId, carouselIndex = 1, imageIndex, prompt, alt_text } = await req.json();
    if (!postId || !imageIndex || !prompt) {
      return new Response(JSON.stringify({ error: 'postId, imageIndex and prompt are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fast response so caller isn't blocked
    const res = new Response(JSON.stringify({ accepted: true, postId, imageIndex }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    EdgeRuntime.waitUntil(handleImageJob({ supabase, postId, carouselIndex, imageIndex, prompt, alt_text }));
    return res;
  } catch (error) {
    console.error('[generate-social-image] error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleImageJob({ supabase, postId, carouselIndex, imageIndex, prompt, alt_text }: any) {
  try {
    // If already exists, skip (idempotent)
    const { data: existing } = await supabase
      .from('social_media_images')
      .select('id')
      .eq('post_id', postId)
      .eq('carousel_index', carouselIndex)
      .eq('image_index', imageIndex)
      .limit(1);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`[generate-social-image] Image already exists for ${postId}#${imageIndex}`);
      return;
    }

    // Check cancellation
    const { data: postCheck } = await supabase
      .from('social_media_posts')
      .select('status')
      .eq('id', postId)
      .single();
    if (postCheck?.status === 'cancelled') {
      console.log(`[generate-social-image] Cancelled for ${postId}`);
      return;
    }

    const imageUrl = await generateImage(openAIApiKey!, prompt);

    await supabase.from('social_media_images').insert({
      post_id: postId,
      carousel_index: carouselIndex,
      image_index: imageIndex,
      image_url: imageUrl,
      image_prompt: prompt,
      alt_text: alt_text ?? `Slide ${imageIndex}`,
    });

    // Update progress via RPC (with fallback)
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

    // If all 9 are present, finalize
    const { count } = await supabase
      .from('social_media_images')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('carousel_index', carouselIndex);

    if ((count ?? 0) >= 9) {
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
      console.log(`[generate-social-image] Completed post ${postId}`);
    } else {
      console.log(`[generate-social-image] Progress ${count}/9 for ${postId}`);
    }
  } catch (err) {
    console.error('[generate-social-image] job error:', err);
    // Best-effort failure tracking
    const { data: cur } = await supabase
      .from('social_media_posts')
      .select('generation_progress')
      .eq('id', postId)
      .single();
    const failed = cur?.generation_progress?.failed_images || [];
    await supabase
      .from('social_media_posts')
      .update({ generation_progress: { ...cur?.generation_progress, failed_images: [...failed, imageIndex], last_error: String(err?.message || err) } })
      .eq('id', postId);
  }
}

async function generateImage(openAIApiKey: string, prompt: string): Promise<string> {
  const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'high', output_format: 'png' }),
  });

  if (!imageResponse.ok) {
    const errorData = await imageResponse.json();
    console.error('[generate-social-image] OpenAI image error:', errorData);
    throw new Error(errorData.error?.message || `Image generation failed: ${imageResponse.status}`);
  }

  const imageData = await imageResponse.json();
  const base64Image = imageData.data[0].b64_json;
  const imageBuffer = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));

  const fileName = `social-media-${Date.now()}-${crypto.randomUUID()}.png`;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { error: uploadError } = await supabase.storage.from('generated-images').upload(fileName, imageBuffer, { contentType: 'image/png' });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(fileName);
  return urlData.publicUrl;
}
