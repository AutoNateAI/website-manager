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
      postId,
      title,
      platform,
      style,
      voice,
      sourceItems,
      imageSeedUrl,
      imageSeedInstructions
    } = await req.json();

    console.log('Starting social media content generation for post:', postId);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch source content details
    const sourceContent = await fetchSourceContent(supabase, sourceItems);
    
    // Generate caption and hashtags
    const { caption, hashtags } = await generateCaptionAndHashtags(
      sourceContent, platform, style, voice, title
    );

    // Update post with caption and hashtags
    await supabase
      .from('social_media_posts')
      .update({
        caption,
        hashtags
      })
      .eq('id', postId);

    // Generate 3 carousels of 9 images each (27 total)
    await generateImageCarousels(
      supabase, 
      postId, 
      sourceContent, 
      platform, 
      style, 
      voice,
      imageSeedUrl,
      imageSeedInstructions
    );

    console.log('Social media content generation completed');

    return new Response(JSON.stringify({
      success: true,
      postId,
      caption,
      hashtags
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

async function fetchSourceContent(supabase: any, sourceItems: SourceItem[]) {
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
  title: string
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

  const prompt = `Create an engaging ${platform} ${style.toLowerCase()} post with a ${voice.toLowerCase()} voice.

Title: ${title}
Source Content:
${contentSummary}

Generate:
1. A captivating caption that builds energy and engagement (150-300 words for LinkedIn, 100-150 for Instagram)
2. 10-15 relevant hashtags

The content should:
- Use authoritative expertise with great metaphors
- Be captivating and have smooth language that builds energy
- Be funny yet informative
- Make people want to share and repost
- Include a subtle call-to-action to get custom AI-integrated software built

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
  const result = JSON.parse(data.choices[0].message.content);
  
  return {
    caption: result.caption,
    hashtags: result.hashtags
  };
}

async function generateImageCarousels(
  supabase: any,
  postId: string,
  sourceContent: any[],
  platform: string,
  style: string,
  voice: string,
  imageSeedUrl?: string,
  imageSeedInstructions?: string
) {
  const imagePrompts = await generateImagePrompts(
    sourceContent, platform, style, voice, imageSeedUrl, imageSeedInstructions
  );

  // Generate images in parallel batches
  const batchSize = 9; // Process one carousel at a time
  
  for (let carouselIndex = 1; carouselIndex <= 3; carouselIndex++) {
    const carouselPrompts = imagePrompts.slice((carouselIndex - 1) * 9, carouselIndex * 9);
    
    // Generate images for this carousel in parallel
    const imagePromises = carouselPrompts.map(async (prompt, imageIndex) => {
      const actualImageIndex = imageIndex + 1;
      console.log(`Generating image ${actualImageIndex}/9 for carousel ${carouselIndex}`);
      
      const imageUrl = await generateImage(prompt, imageSeedUrl);
      
      // Save to database
      await supabase
        .from('social_media_images')
        .insert({
          post_id: postId,
          carousel_index: carouselIndex,
          image_index: actualImageIndex,
          image_url: imageUrl,
          image_prompt: prompt,
          alt_text: `Carousel ${carouselIndex} Image ${actualImageIndex}`
        });
      
      return imageUrl;
    });
    
    await Promise.all(imagePromises);
    console.log(`Completed carousel ${carouselIndex}/3`);
  }
}

async function generateImagePrompts(
  sourceContent: any[],
  platform: string,
  style: string,
  voice: string,
  imageSeedUrl?: string,
  imageSeedInstructions?: string
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

  const prompt = `Create 27 image prompts for 3 social media carousels (9 images each) for ${platform}.

Source Content:
${contentSummary}

Style: ${style}
Voice: ${voice}${seedContext}

Each carousel should have:
- Image 1: Captivating hook with bold text overlay that stops scrolling
- Images 2-8: Detail images with great graphics, building climactic engagement
- Image 9: Strong CTA pointing to live builds, blogs, or custom AI software

Requirements:
- Square 1:1 aspect ratio
- Modern, professional design
- Include text overlays where appropriate
- Use consistent visual theme per carousel
- Be engaging, shareable, and informative
- Build energy and momentum through the sequence

Return as JSON array of 27 prompts:
["prompt 1", "prompt 2", ..., "prompt 27"]`;

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
  return JSON.parse(data.choices[0].message.content);
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