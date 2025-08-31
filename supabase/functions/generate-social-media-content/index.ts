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
      mediaType,
      postConcepts
    } = await req.json();

  console.log('Starting social media content generation for 3 separate posts with refined concepts');
  console.log('Received data:', { title, platform, style, voice, mediaType });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize optional source items (can be empty)
    const normalizedSourceItems = Array.isArray(sourceItems) ? sourceItems : [];

    // Fetch source content details
    const sourceContent = await fetchSourceContent(supabase, normalizedSourceItems);
    
    // Generate all captions in parallel
    const captionPromises = postConcepts.map((concept, index) =>
      generateCaptionAndHashtags(sourceContent, platform, style, voice, concept, mediaType || 'evergreen', contextDirection)
    );
    const captionResults = await Promise.all(captionPromises);

    // Create all 3 posts in parallel
    const postPromises = postConcepts.map(async (concept, index) => {
      const { caption, hashtags } = captionResults[index];
      
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
          context_direction: contextDirection || null,
          media_type: mediaType || 'evergreen'
        })
        .select()
        .single();

      if (postError) throw postError;
      return postData;
    });

    const createdPosts = await Promise.all(postPromises);

    // Generate all image prompts for all posts in parallel
    const allImagePromises = [];
    
    for (let postIndex = 0; postIndex < createdPosts.length; postIndex++) {
      const postData = createdPosts[postIndex];
      const concept = postConcepts[postIndex];
      
      const imagePrompts = await generateImagePrompts(
        sourceContent, platform, style, voice, imageSeedUrl, imageSeedInstructions, concept, mediaType || 'evergreen', postIndex + 1
      );

      // Create promises for all 9 images of this carousel
      for (let imageIndex = 0; imageIndex < imagePrompts.length; imageIndex++) {
        const prompt = imagePrompts[imageIndex];
        const actualImageIndex = imageIndex + 1;
        
        const imagePromise = generateImage(prompt, imageSeedUrl).then(async (imageUrl) => {
          // Save to database
          await supabase
            .from('social_media_images')
            .insert({
              post_id: postData.id,
              carousel_index: 1,
              image_index: actualImageIndex,
              image_url: imageUrl,
              image_prompt: prompt,
              alt_text: `Carousel ${postIndex + 1} Image ${actualImageIndex}`
            });
          
          console.log(`Completed image ${actualImageIndex}/9 for post ${postIndex + 1}`);
          return imageUrl;
        });
        
        allImagePromises.push(imagePromise);
      }
    }

    // Generate ALL 27 images in parallel
    console.log(`Starting parallel generation of ${allImagePromises.length} images`);
    await Promise.all(allImagePromises);
    console.log('All images generated successfully');

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
  mediaType: string,
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

  let systemPrompt = '';
  let userPrompt = '';

  if (mediaType === 'company') {
    systemPrompt = 'You are an expert AI solutions consultant who creates compelling content that teaches companies about AI command centers and automation. You understand business pain points and can articulate technical solutions in business terms.';
    userPrompt = `Create an engaging ${platform} ${style.toLowerCase()} post with a ${voice.toLowerCase()} voice that teaches companies about AI command centers and automation solutions.

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
1. A compelling caption that explains AI command center benefits for businesses (150-300 words for LinkedIn, 100-150 for Instagram)
2. 10-15 business-focused hashtags including AI, automation, and industry-specific terms

The content should:
- Address real business challenges and solutions
- Explain AI command center benefits in business terms
- Include specific capabilities and ROI potential
- Use professional language appropriate for decision-makers
- End with a business-focused call-to-action
- Position AI expertise naturally without being overly promotional

Return in JSON format:
{
  "caption": "...",
  "hashtags": ["hashtag1", "hashtag2", ...]
}`;
  } else if (mediaType === 'advertisement') {
    systemPrompt = 'You are an expert marketing copywriter who creates high-converting social media content for AI services. You understand how to showcase expertise while building trust and driving action.';
    userPrompt = `Create a compelling ${platform} ${style.toLowerCase()} advertisement with a ${voice.toLowerCase()} voice that showcases your AI command center expertise and drives conversions.

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
1. A persuasive caption that showcases AI expertise and drives action (150-300 words for LinkedIn, 100-150 for Instagram)
2. 10-15 conversion-focused hashtags including service keywords and industry terms

The content should:
- Highlight unique AI command center capabilities
- Include social proof or results where relevant
- Build credibility and trust
- Create urgency or value proposition
- End with a strong call-to-action for consultation/demo
- Be persuasive but not pushy or overly salesy

Return in JSON format:
{
  "caption": "...",
  "hashtags": ["hashtag1", "hashtag2", ...]
}`;
  } else {
    systemPrompt = 'You are an expert AI researcher and educator who creates valuable educational content for the tech community. You excel at making complex concepts accessible and engaging.';
    userPrompt = `Create an engaging ${platform} ${style.toLowerCase()} educational post with a ${voice.toLowerCase()} voice that provides valuable insights to the AI/tech community.

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
1. An educational caption that provides genuine value and insights (150-300 words for LinkedIn, 100-150 for Instagram)
2. 10-15 community-focused hashtags including AI, tech, research, and learning terms

The content should:
- Provide genuine educational value and insights
- Be backed by research or solid expertise
- Use an authoritative yet accessible tone
- Include actionable takeaways or thought-provoking questions
- End with a community-building call-to-action
- Focus on learning and sharing rather than promotion

Return in JSON format:
{
  "caption": "...",
  "hashtags": ["hashtag1", "hashtag2", ...]
}`;
  }

  console.log('Generated enhanced prompt for', mediaType);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1000
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

async function generateImagePrompts(
  sourceContent: any[],
  platform: string,
  style: string,
  voice: string,
  imageSeedUrl?: string,
  imageSeedInstructions?: string,
  concept?: any,
  mediaType?: string,
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

  let prompt = '';
  
  if (mediaType === 'company') {
    prompt = `Create 9 image prompts for a ${platform} carousel targeting COMPANIES about AI command centers and automation solutions.

Source Content:
${contentSummary}

Style: ${style}
Voice: ${voice}${seedContext}${conceptContext}

The carousel should teach companies about AI command centers:
- Image 1: Captivating business hook with professional text overlay - "${concept?.title || 'AI Command Centers Transform Business'}"
- Images 2-8: Business-focused visuals showing AI automation benefits, ROI, efficiency gains, dashboard mockups, process improvements
- Image 9: Professional CTA image encouraging consultation or demo

Requirements:
- Square 1:1 aspect ratio, professional business aesthetic
- Corporate-friendly design with clean text overlays
- Show AI dashboards, automation workflows, business metrics
- Target business decision-makers and technical leaders
- Professional color schemes (blues, grays, clean whites)
- Include business icons, charts, productivity themes
- Modern enterprise software aesthetic

Return as JSON array of 9 prompts:
["prompt 1", "prompt 2", ..., "prompt 9"]`;
  } else if (mediaType === 'advertisement') {
    prompt = `Create 9 image prompts for a ${platform} carousel ADVERTISING your AI command center services and expertise.

Source Content:
${contentSummary}

Style: ${style}
Voice: ${voice}${seedContext}${conceptContext}

The carousel should showcase your AI expertise and drive conversions:
- Image 1: Attention-grabbing service showcase with compelling text overlay - "${concept?.title || 'Custom AI Solutions'}"
- Images 2-8: Portfolio pieces, capability demonstrations, before/after results, technology stacks, client success stories
- Image 9: Strong conversion-focused CTA image with contact information

Requirements:
- Square 1:1 aspect ratio, premium service provider aesthetic
- High-quality, professional design that builds trust
- Show your AI technologies, custom solutions, results
- Include portfolio elements, technology logos, success metrics
- Premium color schemes that convey expertise
- Modern, cutting-edge visual style
- Build credibility and showcase differentiation

Return as JSON array of 9 prompts:
["prompt 1", "prompt 2", ..., "prompt 9"]`;
  } else {
    prompt = `Create 9 image prompts for a ${platform} carousel providing EDUCATIONAL content to the AI/tech community.

Source Content:
${contentSummary}

Style: ${style}
Voice: ${voice}${seedContext}${conceptContext}

The carousel should educate and inform the community:
- Image 1: Educational hook with engaging text overlay - "${concept?.title || 'AI Insights'}"
- Images 2-8: Educational diagrams, research visualizations, concept explanations, trend analyses, technical insights
- Image 9: Community-building CTA encouraging discussion and learning

Requirements:
- Square 1:1 aspect ratio, educational and accessible design
- Clean, informative visuals with clear text overlays
- Include charts, diagrams, research visualizations, concept maps
- Target AI enthusiasts, researchers, and practitioners
- Use engaging but professional color schemes
- Focus on clarity and educational value
- Modern tech-forward aesthetic

Return as JSON array of 9 prompts:
["prompt 1", "prompt 2", ..., "prompt 9"]`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        { role: 'system', content: 'You are an expert visual content creator who designs viral social media carousels.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 2000
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