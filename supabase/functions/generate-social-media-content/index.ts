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
  
  // Fetch source content once for all posts
  const sourceContent = await fetchSourceContent(supabase, sourceItems);
  
  // Process all posts in parallel
  const processingPromises = postIds.map(async (postId, index) => {
    const concept = postConcepts[index];
    
    try {
      // Check if post was cancelled
      const { data: currentPost } = await supabase
        .from('social_media_posts')
        .select('status')
        .eq('id', postId)
        .single();
      
      if (currentPost?.status === 'cancelled') {
        console.log(`Post ${postId} was cancelled, skipping processing`);
        return;
      }

      // Generate caption and image prompts in parallel (no dependency)
      console.log(`Starting parallel generation for post ${postId}: caption + image prompts`);
      
      const [captionResult, imagePrompts] = await Promise.all([
        // Update status and generate caption
        supabase
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
          .eq('id', postId)
          .then(() => generateCaptionAndHashtags(openAIApiKey, sourceContent, concept, platform, style, voice)),
        
        // Generate image prompts in parallel
        generateImagePrompts(openAIApiKey, sourceContent, concept, platform, style, voice, { caption: concept.title })
      ]);
      
      // Update with generated caption and start images
      await supabase
        .from('social_media_posts')
        .update({ 
          caption: captionResult.caption,
          hashtags: captionResult.hashtags,
          status: 'generating_images',
          generation_progress: {
            step: 'generating_images',
            concept_index: index + 1,
            total_concepts: postConcepts.length,
            images_total: 9,
            images_completed: 0,
            failed_images: [],
            started_at: new Date().toISOString()
          }
        })
        .eq('id', postId);
        
      // Generate all 9 images in parallel with resilient error handling
      const successCount = await generateImageCarousel(supabase, openAIApiKey, postId, index + 1, captionResult, concept, platform, style, voice, sourceContent, imagePrompts);

      // Check if cancelled before completion
      const { data: finalPost } = await supabase
        .from('social_media_posts')
        .select('status')
        .eq('id', postId)
        .single();
      
      if (finalPost?.status === 'cancelled') {
        console.log(`Post ${postId} was cancelled before completion`);
        return;
      }
      
      // Only mark completed if at least 1 image succeeded
      if (successCount > 0) {
        await supabase
          .from('social_media_posts')
          .update({ 
            status: 'completed',
            generation_progress: {
              step: 'completed',
              concept_index: index + 1,
              total_concepts: postConcepts.length,
              images_total: 9,
              images_completed: successCount,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', postId);

        console.log(`Completed processing post ${postId} with ${successCount}/9 images`);
      } else {
        // All images failed
        await supabase
          .from('social_media_posts')
          .update({ 
            status: 'failed',
            generation_progress: {
              step: 'failed',
              concept_index: index + 1,
              total_concepts: postConcepts.length,
              error: 'All image generation attempts failed',
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', postId);
        
        console.log(`Post ${postId} failed - no images generated successfully`);
      }
      
    } catch (error) {
      console.error(`Error processing post ${postId}:`, error);
      
      // Mark as failed with specific error
      await supabase
        .from('social_media_posts')
        .update({ 
          status: 'failed',
          generation_progress: {
            step: 'failed',
            concept_index: index + 1,
            total_concepts: postConcepts.length,
            error: error.message || 'Unknown error during processing',
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
  const contentStrings = [];
  
  for (const item of sourceItems) {
    if (item.type === 'blog') {
      const { data } = await supabase
        .from('blogs')
        .select('title, excerpt, content, category')
        .eq('id', item.id)
        .single();
      if (data) {
        contentStrings.push(`BLOG: ${data.title}\nCategory: ${data.category}\nExcerpt: ${data.excerpt}\nContent: ${data.content}`);
      }
    } else if (item.type === 'live_build') {
      const { data } = await supabase
        .from('live_builds')
        .select('title, description, short_description, content')
        .eq('id', item.id)
        .single();
      if (data) {
        contentStrings.push(`LIVE BUILD: ${data.title}\nDescription: ${data.description}\nContent: ${data.content || data.short_description}`);
      }
    } else if (item.type === 'ad') {
      const { data } = await supabase
        .from('advertisements')
        .select('title, alt_text')
        .eq('id', item.id)
        .single();
      if (data) {
        contentStrings.push(`ADVERTISEMENT: ${data.title}\nDescription: ${data.alt_text}`);
      }
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
  console.log(`Generating caption for concept: ${concept.title}`);
  
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

  // Use gpt-4o for better stability with temperature + max_tokens
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert social media content creator who writes viral, engaging posts. Always return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error for caption generation:', errorData);
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = parseJSONSafe(data.choices?.[0]?.message?.content ?? '{}');
  console.log(`Caption generated successfully for: ${concept.title}`);
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
  sourceContent: string,
  imagePrompts: Array<{ prompt: string; alt_text: string }>
): Promise<number> {
  console.log(`Generating image carousel ${carouselIndex} for post ${postId}`);
  
  // Generate all 9 images in parallel with retries
  const imagePromises = imagePrompts.map(async (prompt, imageIndex) => {
    const actualImageIndex = imageIndex + 1;
    
    // Retry logic for each image
    for (let retry = 0; retry < 3; retry++) {
      try {
        // Check if generation was cancelled
        const { data: postCheck } = await supabase
          .from('social_media_posts')
          .select('status')
          .eq('id', postId)
          .single();
        
        if (postCheck?.status === 'cancelled') {
          console.log(`Generation cancelled for image ${actualImageIndex}`);
          return { success: false, imageIndex: actualImageIndex, cancelled: true };
        }

        const imageUrl = await generateImage(supabase, openAIApiKey, prompt.prompt);
        
        // Save image to database
        await supabase
          .from('social_media_images')
          .insert({
            post_id: postId,
            carousel_index: carouselIndex,
            image_index: actualImageIndex,
            image_url: imageUrl,
            image_prompt: prompt.prompt,
            alt_text: prompt.alt_text
          });

        // Atomic progress update (avoid race conditions)
        await supabase.rpc('increment_image_progress', {
          post_id_param: postId,
          carousel_index_param: carouselIndex
        }).catch(() => {
          // Fallback: manual progress update if RPC doesn't exist
          return supabase
            .from('social_media_posts')
            .select('generation_progress')
            .eq('id', postId)
            .single()
            .then(({ data }) => {
              const current = data?.generation_progress?.images_completed || 0;
              return supabase
                .from('social_media_posts')
                .update({ 
                  generation_progress: {
                    ...data?.generation_progress,
                    step: 'generating_images',
                    images_completed: current + 1,
                    last_completed_image: actualImageIndex
                  }
                })
                .eq('id', postId);
            });
        });
        
        console.log(`Completed image ${actualImageIndex}/9 for carousel ${carouselIndex}`);
        return { success: true, imageIndex: actualImageIndex };
        
      } catch (error) {
        console.error(`Error generating image ${actualImageIndex} (attempt ${retry + 1}):`, error);
        
        if (retry === 2) {
          // Final attempt failed, mark as failed
          await supabase
            .from('social_media_posts')
            .select('generation_progress')
            .eq('id', postId)
            .single()
            .then(({ data }) => {
              const failedImages = data?.generation_progress?.failed_images || [];
              return supabase
                .from('social_media_posts')
                .update({ 
                  generation_progress: {
                    ...data?.generation_progress,
                    failed_images: [...failedImages, actualImageIndex],
                    last_error: error.message
                  }
                })
                .eq('id', postId);
            });
            
          return { success: false, imageIndex: actualImageIndex, error: error.message };
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
      }
    }
  });
  
  // Wait for all images to complete
  const results = await Promise.all(imagePromises);
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success && !r.cancelled).length;
  
  console.log(`Completed carousel ${carouselIndex}: ${successCount}/${imagePrompts.length} images generated successfully, ${failedCount} failed`);
  return successCount;
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
  
  const prompt = `Create 9 distinct image prompts for a ${platform} carousel that tells a cohesive STORY. This is a visual narrative that users will swipe through, so each image should flow naturally to the next while building on the previous ones.

STORY CONCEPT:
Title: ${concept.title}
Target Audience: ${concept.targetAudience}
Content Angle: ${concept.angle}
Key Messages: ${concept.keyMessages.join(', ')}
Caption: ${captionData.caption}

${sourceContent ? `Source Content:\n${sourceContent}\n` : ''}

CRITICAL: Create a 9-slide visual story that follows this narrative structure:
Slide 1: Hook/Problem introduction - grab attention with the main challenge
Slide 2: Emotional connection - show the pain/frustration of the problem
Slide 3: The "aha" moment - introduce the solution concept
Slide 4: Benefits visualization - show positive outcomes
Slide 5: Process/How it works - demonstrate the solution in action
Slide 6: Transformation - before vs after or results
Slide 7: Social proof/credibility - trust signals
Slide 8: Call to action setup - create urgency/desire
Slide 9: Strong CTA - direct next step with clear value

Each image should:
- Build on the previous image's narrative
- Use consistent visual style (${style})
- Be optimized for ${platform} carousel format
- Have clear visual hierarchy and readability
- Include subtle text overlays where appropriate for context

Return in JSON format:
{
  "images": [
    {
      "prompt": "detailed image generation prompt with story context and slide position",
      "alt_text": "accessibility description"
    }
  ]
}`;

  // Use gpt-4o for better stability
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert visual storyteller who creates compelling narrative-driven image prompts for social media carousels that tell cohesive stories. Always return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2500,
      temperature: 0.8
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error for image prompts:', errorData);
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  
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

  if (!imageResponse.ok) {
    const errorData = await imageResponse.json();
    console.error('OpenAI image generation error:', errorData);
    throw new Error(errorData.error?.message || `Image generation failed: ${imageResponse.status}`);
  }
  
  const imageData = await imageResponse.json();

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