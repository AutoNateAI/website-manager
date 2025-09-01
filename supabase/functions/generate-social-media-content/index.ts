import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting non-blocking social media content generation');
    
    const { postConcepts, platform, style, voice, mediaType, sourceItems = [] } = await req.json();
    
    if (!postConcepts || !Array.isArray(postConcepts) || postConcepts.length !== 3) {
      throw new Error('Invalid postConcepts: must be an array of exactly 3 concepts');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create post records immediately with pending status
    const createdPostIds: string[] = [];
    for (let i = 0; i < postConcepts.length; i++) {
      const concept = postConcepts[i];
      
      const { data: postData, error: postError } = await supabase
        .from('social_media_posts')
        .insert({
          title: concept.title || `Generated Post ${i + 1}`,
          platform: platform,
          style: style,
          voice: voice,
          media_type: mediaType || 'evergreen_content',
          status: 'pending',
          generation_progress: {
            step: 'initialized',
            concept_index: i + 1,
            total_concepts: postConcepts.length,
            started_at: new Date().toISOString()
          },
          caption: 'Generating...',
          hashtags: [],
          source_items: sourceItems,
          is_published: false
        })
        .select()
        .single();

      if (postError) {
        console.error('Error creating post:', postError);
        throw postError;
      }

      createdPostIds.push(postData.id);
    }

    // Return immediately with post IDs
    const response = new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Social media posts created and generation started',
        postIds: createdPostIds
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

    // Start background processing
    EdgeRuntime.waitUntil(
      processPostsInBackground(supabase, openAIApiKey, createdPostIds, postConcepts, platform, style, voice, sourceItems)
    );

    return response;
  } catch (error) {
    console.error('Error in generate-social-media-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate social media content' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Background processing function
async function processPostsInBackground(
  supabase: any,
  openAIApiKey: string,
  postIds: string[],
  postConcepts: any[],
  platform: string,
  style: string,
  voice: string,
  sourceItems: any[]
) {
  console.log(`Starting background processing for ${postIds.length} posts`);
  
  // Process all posts in parallel
  const processingPromises = postIds.map(async (postId, index) => {
    const concept = postConcepts[index];
    
    try {
      // Update status to generating caption
      await supabase
        .from('social_media_posts')  
        .update({ 
          status: 'generating_caption',
          generation_progress: {
            step: 'generating_caption',
            concept_index: index + 1,
            total_concepts: postConcepts.length,
            started_at: new Date().toISOString()
          }
        })
        .eq('id', postId);

      // Fetch source content details
      const sourceContent = await fetchSourceContent(supabase, sourceItems);

      // Generate caption and hashtags
      const captionData = await generateCaptionAndHashtags(
        openAIApiKey,
        sourceContent,
        concept,
        platform,
        style,
        voice
      );

      // Update post with caption
      await supabase
        .from('social_media_posts')
        .update({ 
          caption: captionData.caption,
          hashtags: captionData.hashtags,
          status: 'generating_images',
          generation_progress: {
            step: 'generating_images',
            concept_index: index + 1,
            total_concepts: postConcepts.length,
            images_total: 9,
            images_completed: 0,
            started_at: new Date().toISOString()
          }
        })
        .eq('id', postId);

      // Generate image carousel
      await generateImageCarousel(supabase, openAIApiKey, postId, index + 1, captionData, concept, platform, style, voice, sourceContent);
      
      // Mark as completed
      await supabase
        .from('social_media_posts')
        .update({ 
          status: 'completed',
          generation_progress: {
            step: 'completed',
            concept_index: index + 1,
            total_concepts: postConcepts.length,
            images_total: 9,
            images_completed: 9,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', postId);

      console.log(`Completed processing post ${postId}`);
      
    } catch (error) {
      console.error(`Error processing post ${postId}:`, error);
      
      // Mark as failed
      await supabase
        .from('social_media_posts')
        .update({ 
          status: 'failed',
          generation_progress: {
            step: 'failed',
            concept_index: index + 1,
            total_concepts: postConcepts.length,
            error: error.message,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', postId);
    }
  });

  // Wait for all posts to complete
  await Promise.all(processingPromises);
  console.log('Background processing completed for all posts');
}

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
  
  return content.join('\n\n');
}

async function generateCaptionAndHashtags(
  openAIApiKey: string,
  sourceContent: string,
  concept: any,
  platform: string,
  style: string,
  voice: string
): Promise<{ caption: string; hashtags: string[] }> {
  
  const prompt = `Create an engaging ${platform} ${style} post using a ${voice.toLowerCase()} voice based on this concept:

Title/Hook: ${concept.title}
Target Audience: ${concept.targetAudience}
Content Angle: ${concept.angle}
Key Messages: ${concept.keyMessages.join(', ')}
Call to Action: ${concept.callToAction}

${sourceContent ? `Source Content:\n${sourceContent}\n` : ''}

Create:
1. A compelling caption (optimized for ${platform})
2. 8-15 relevant hashtags

Return in JSON format:
{
  "caption": "engaging caption text",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert social media content creator who writes viral, engaging posts.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 1000
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('OpenAI error:', data);
    throw new Error(data.error?.message || 'Failed to generate caption');
  }
  
  const result = parseJSONSafe(data.choices?.[0]?.message?.content ?? '{}');
  return {
    caption: result.caption || 'Generated caption',
    hashtags: result.hashtags || []
  };
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
  sourceContent: string
) {
  console.log(`Generating image carousel ${carouselIndex} for post ${postId}`);
  
  // Generate 9 image prompts for the carousel
  const imagePrompts = await generateImagePrompts(
    openAIApiKey,
    sourceContent,
    concept,
    platform,
    style,
    voice,
    captionData
  );

  // Limit concurrency to prevent rate limiting
  const MAX_CONCURRENT = 6;
  for (let i = 0; i < imagePrompts.length; i += MAX_CONCURRENT) {
    const batch = imagePrompts.slice(i, i + MAX_CONCURRENT);
    const batchPromises = batch.map(async (prompt, batchIndex) => {
      const imageIndex = i + batchIndex + 1;
      console.log(`Generating image ${imageIndex}/9 for carousel ${carouselIndex}`);
      
      try {
        const imageUrl = await generateImage(supabase, openAIApiKey, prompt.prompt);
        
        // Save image to database
        await supabase
          .from('social_media_images')
          .insert({
            post_id: postId,
            carousel_index: carouselIndex,
            image_index: imageIndex,
            image_url: imageUrl,
            image_prompt: prompt.prompt,
            alt_text: prompt.alt_text
          });

        // Update progress
        await supabase
          .from('social_media_posts')
          .update({ 
            generation_progress: {
              step: 'generating_images',
              concept_index: carouselIndex,
              total_concepts: 3,
              images_total: 9,
              images_completed: imageIndex
            }
          })
          .eq('id', postId);
          
      } catch (error) {
        console.error(`Error generating image ${imageIndex}:`, error);
      }
    });
    
    await Promise.all(batchPromises);
  }
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
  
  const prompt = `Create 9 distinct image prompts for a ${platform} carousel based on this concept:

Title: ${concept.title}
Target Audience: ${concept.targetAudience}
Content Angle: ${concept.angle}
Key Messages: ${concept.keyMessages.join(', ')}
Caption: ${captionData.caption}

${sourceContent ? `Source Content:\n${sourceContent}\n` : ''}

Create 9 visually distinct prompts that:
1. Support the key messages
2. Are visually appealing for ${platform}
3. Tell a cohesive story as a carousel
4. Use ${style} aesthetic

Return in JSON format:
{
  "images": [
    {
      "prompt": "detailed image generation prompt",
      "alt_text": "accessibility description"
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
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert visual designer who creates compelling image prompts for social media carousels.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2000
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('OpenAI error:', data);
    throw new Error(data.error?.message || 'Failed to generate image prompts');
  }
  
  const result = parseJSONSafe(data.choices?.[0]?.message?.content ?? '{}');
  return result.images || [];
}

async function generateImage(
  supabase: any,
  openAIApiKey: string,
  prompt: string,
  referenceImageUrl?: string
): Promise<string> {
  
  const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
      output_format: 'png'
    }),
  });

  const imageData = await imageResponse.json();
  if (!imageResponse.ok) {
    console.error('OpenAI image generation error:', imageData);
    throw new Error(imageData.error?.message || 'Failed to generate image');
  }

  // OpenAI gpt-image-1 returns base64 encoded image
  const base64Image = imageData.data[0].b64_json;
  const imageBuffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
  
  // Upload to Supabase Storage
  const fileName = `social-media-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error('Failed to upload generated image');
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('generated-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}