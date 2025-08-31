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
      imageSeedUrl,
      imageSeedInstructions,
      contextDirection,
      postConcepts
    } = await req.json();

    console.log('Starting social media content generation for 3 separate posts with refined concepts');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize optional source items (can be empty)
    const normalizedSourceItems = Array.isArray(sourceItems) ? sourceItems : [];

    // Fetch source content details
    const sourceContent = await fetchSourceContent(supabase, normalizedSourceItems);
    
    // Create 3 separate posts using the refined concepts
    const createdPosts = [];
    
    for (let postIndex = 1; postIndex <= 3; postIndex++) {
      const concept = postConcepts[postIndex - 1];
      
      // Generate caption and hashtags for this specific concept
      const { caption, hashtags } = await generateCaptionAndHashtags(
        sourceContent, platform, style, voice, concept, contextDirection
      );

      // Create post
      const { data: postData, error: postError } = await supabase
        .from('social_media_posts')
        .insert({
          title: `${title} - ${concept.title}`,
          platform,
          style,
          voice,
          source_items: sourceItems,
          caption,
          hashtags,
          image_seed_url: imageSeedUrl || null,
          image_seed_instructions: imageSeedInstructions || null,
          context_direction: contextDirection || null
        })
        .select()
        .single();

      if (postError) throw postError;
      
      createdPosts.push(postData);

      // Generate 1 carousel of 9 images for this post
      await generateImageCarousel(
        supabase, 
        postData.id, 
        sourceContent, 
        platform, 
        style, 
        voice,
        imageSeedUrl,
        imageSeedInstructions,
        concept,
        postIndex
      );
    }

    console.log('Social media content generation completed for 3 posts');

    return new Response(JSON.stringify({
      success: true,
      postsCreated: createdPosts.length,
      postIds: createdPosts.map(p => p.id)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

// Robust JSON parser to handle code fences or extra text
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

async function generateCaptionAndHashtags(
  sourceContent: any[], 
  platform: string, 
  style: string, 
  voice: string,
  concept: any,
  contextDirection?: string
) {
  const contentSummary = sourceContent.map(item => {
    if (item.type === 'blog') {
      return `Blog: ${item.title} - ${item.excerpt}`;
    } else if (item.type === 'live_build') {
      return `Live Build: ${item.title} - ${item.description}`;
    } else {
      return `Ad: ${item.title}`;
    }
  }).join('\n');

  const contextText = contextDirection ? `\n\nAdditional Context: ${contextDirection}` : '';

  const prompt = `Create an engaging ${platform} ${style.toLowerCase()} post with a ${voice.toLowerCase()} voice based on this specific concept:

Post Concept:
- Title/Hook: ${concept.title}
- Content Angle: ${concept.angle}
- Target Audience: ${concept.targetAudience}
- Key Messages: ${concept.keyMessages.join(', ')}
- Tone: ${concept.tone}
- Call to Action: ${concept.callToAction}

Source Content:
${contentSummary}${contextText}

Generate:
1. A captivating caption that follows the concept's angle and targets the specified audience (150-300 words for LinkedIn, 100-150 for Instagram)
2. 10-15 relevant hashtags that align with the target audience and content angle

The content should:
- Strictly follow the concept's angle and tone
- Target the specified audience with appropriate language and examples
- Include the key messages naturally within the flow
- End with the specified call-to-action
- Be engaging enough to encourage sharing and comments

Return in JSON format:
{
  "caption": "...",
  "hashtags": ["hashtag1", "hashtag2", ...]
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
        { role: 'system', content: 'You are an expert social media content creator who creates viral, engaging posts.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 1000
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('OpenAI caption API error:', data);
    throw new Error(data.error?.message || 'Failed to generate caption');
  }
  const result = parseJSONSafe(data.choices?.[0]?.message?.content ?? '{}');
  
  return {
    caption: result.caption,
    hashtags: result.hashtags
  };
}

async function generateImageCarousel(
  supabase: any,
  postId: string,
  sourceContent: any[],
  platform: string,
  style: string,
  voice: string,
  imageSeedUrl?: string,
  imageSeedInstructions?: string,
  concept?: any,
  carouselNumber?: number
) {
  const imagePrompts = await generateImagePrompts(
    sourceContent, platform, style, voice, imageSeedUrl, imageSeedInstructions, concept, carouselNumber
  );

  // Generate 9 images for this carousel
  const imagePromises = imagePrompts.map(async (prompt, imageIndex) => {
    const actualImageIndex = imageIndex + 1;
    console.log(`Generating image ${actualImageIndex}/9 for carousel ${carouselNumber || 1}`);
    
    const imageUrl = await generateImage(prompt, imageSeedUrl);
    
    // Save to database (carousel_index = 1 since each post has only one carousel now)
    await supabase
      .from('social_media_images')
      .insert({
        post_id: postId,
        carousel_index: 1,
        image_index: actualImageIndex,
        image_url: imageUrl,
        image_prompt: prompt,
        alt_text: `Carousel ${carouselNumber || 1} Image ${actualImageIndex}`
      });
    
    return imageUrl;
  });
  
  await Promise.all(imagePromises);
  console.log(`Completed carousel ${carouselNumber || 1}`);
}

async function generateImagePrompts(
  sourceContent: any[],
  platform: string,
  style: string,
  voice: string,
  imageSeedUrl?: string,
  imageSeedInstructions?: string,
  concept?: any,
  carouselNumber?: number
) {
  const contentSummary = sourceContent.map(item => {
    if (item.type === 'blog') {
      return `Blog: ${item.title} - ${item.excerpt}`;
    } else if (item.type === 'live_build') {
      return `Live Build: ${item.title} - ${item.description}`;
    } else {
      return `Ad: ${item.title}`;
    }
  }).join('\n');

  const seedContext = imageSeedUrl ? `\n\nReference Image Context: ${imageSeedInstructions || 'Use this image as style/composition reference'}` : '';
  
  const conceptContext = concept ? `\n\nPost Concept to Follow:
- Title/Hook: ${concept.title}
- Content Angle: ${concept.angle}
- Target Audience: ${concept.targetAudience}
- Key Messages: ${concept.keyMessages.join(', ')}
- Tone: ${concept.tone}
- Call to Action: ${concept.callToAction}` : '';

  const prompt = `Create 9 image prompts for a social media carousel for ${platform} that follows this specific concept.

Source Content:
${contentSummary}

Style: ${style}
Voice: ${voice}${seedContext}${conceptContext}

The carousel should have:
- Image 1: Captivating hook with bold text overlay that stops scrolling - should match the concept's title/hook
- Images 2-8: Detail images with great graphics, building climactic engagement - focus on the key messages from the concept
- Image 9: Strong CTA image that aligns with the concept's call-to-action

Requirements:
- Square 1:1 aspect ratio
- Modern, professional design that matches the concept's tone (${concept?.tone || 'engaging'})
- Include text overlays where appropriate
- Target the specified audience: ${concept?.targetAudience || 'general audience'}
- Be engaging, shareable, and informative
- Build energy and momentum through the sequence
- Stay true to the concept's angle and approach

Return as JSON array of 9 prompts:
["prompt 1", "prompt 2", ..., "prompt 9"]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert visual content creator who designs viral social media carousels.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 2000
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('OpenAI prompt API error:', data);
    throw new Error(data.error?.message || 'Failed to generate image prompts');
  }
  return parseJSONSafe(data.choices?.[0]?.message?.content ?? '[]');
}

async function generateImage(prompt: string, referenceImageUrl?: string): Promise<string> {
  const enhancedPrompt = referenceImageUrl 
    ? `${prompt}. Use this reference image for style and composition: ${referenceImageUrl}. Square aspect ratio, social media optimized.`
    : `${prompt}. Square aspect ratio, social media optimized, high quality, modern design.`;

  const requestBody = {
    model: 'gpt-image-1',
    prompt: enhancedPrompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
    output_format: 'png'
  };

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('OpenAI Image API error:', data);
    throw new Error(data.error?.message || 'Failed to generate image');
  }

  // gpt-image-1 returns base64 by default
  const imageData = data.data[0].b64_json;
  
  // Upload to Supabase Storage
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
  const fileName = `social-media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: false
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw uploadError;
  }

  // Get public URL for the uploaded image
  const { data: urlData } = supabase.storage
    .from('generated-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}