import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { blogTitle, blogContent, blogCategory, position, imageSize } = await req.json();

    console.log('Generating ad for blog:', blogTitle);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate ad copy first
    const copyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are a creative advertising copywriter for AutoNateAI, specializing in funny, memorable ads with optical illusions and visual tricks. Create engaging ad copy that relates to blog content while promoting AutoNateAI's specific services. 

AutoNateAI Services:
DIGITAL PRODUCTS: AI Grant Drafting Assistant ($149), Lit Review AI ($129), Cloud Data Pipeline Builder ($129)
COACHING: AI Research Workflow Optimization ($299), Grant Strategy & Review ($499), Literature Review Acceleration ($349), Team Workflow Implementation ($1,499)
WORKSHOPS: AI Grant Writing Mastery, Literature Review Revolution, Research Data Pipeline Implementation, Custom AI Research Workflow Design
TARGET: Graduate students, postdocs, faculty, research teams, academic departments

Only promote AutoNateAI's actual services and make the ads relevant to the research/academic audience.`
          },
          {
            role: 'user',
            content: `Create a funny advertisement for AutoNateAI based on this blog:

Title: ${blogTitle}
Category: ${blogCategory}
Content excerpt: ${blogContent}

The ad is for position: ${position}

Requirements:
1. Create a catchy, humorous title (max 60 characters)
2. Write engaging copy that references the blog content but promotes a specific AutoNateAI service
3. Include clever wordplay or optical illusion concepts
4. Keep it fun and memorable
5. Make it relevant to the blog topic and research/academic audience
6. Only promote AutoNateAI's actual products, coaching, or workshops listed above

Return a JSON object with:
{
  "title": "Ad title",
  "copy": "Full ad copy (2-3 sentences max)",
  "imagePrompt": "Detailed prompt for generating an optical illusion-style image that matches the ad"
}`
          }
        ],
        temperature: 0.8,
      }),
    });

    const copyData = await copyResponse.json();
    
    if (!copyResponse.ok) {
      console.error('OpenAI Copy API error:', copyData);
      throw new Error(copyData.error?.message || 'Failed to generate ad copy');
    }

    let adContent;
    try {
      const rawContent = copyData.choices[0].message.content;
      console.log('Raw OpenAI response:', rawContent);
      
      // Extract JSON from response if it's wrapped in markdown
      const jsonMatch = rawContent.match(/```json\n([\s\S]*?)\n```/) || rawContent.match(/```\n([\s\S]*?)\n```/);
      const contentToParse = jsonMatch ? jsonMatch[1] : rawContent;
      
      adContent = JSON.parse(contentToParse);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Content that failed to parse:', copyData.choices[0]?.message?.content);
      throw new Error(`Failed to parse ad copy response: ${parseError.message}`);
    }

    // Generate the image based on the copy and image prompt
    const isSquareFormat = imageSize === '1024x1024';
    const formatInstruction = isSquareFormat 
      ? 'SQUARE FORMAT (1024x1024): Use the square space efficiently. Place text strategically - consider top/bottom placement for headlines, center for main elements. Make graphical elements complement text placement. Optimize layout for square aspect ratio.'
      : 'WIDE FORMAT: Use the horizontal space effectively for banner-style layout.';
    
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: `Create a funny advertisement image with optical illusion elements. ${adContent.imagePrompt}. ${formatInstruction} Style: vibrant, eye-catching, professional advertising design with clever visual tricks and humor. Include text space for "${adContent.title}". High-quality commercial ad style. CRITICAL: Always include a vibrant, colorful background - NO transparent backgrounds.`,
        n: 1,
        size: imageSize || '1536x1024',
        quality: 'high',
        output_format: 'png'
      }),
    });

    const imageData = await imageResponse.json();
    
    if (!imageResponse.ok) {
      console.error('OpenAI Image API error:', imageData);
      throw new Error(imageData.error?.message || 'Failed to generate image');
    }

    // Upload image to Supabase Storage
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.52.0');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const imageBuffer = Uint8Array.from(atob(imageData.data[0].b64_json), c => c.charCodeAt(0));
    const fileName = `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
    
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

    const imageUrl = urlData.publicUrl;

    console.log('Generated ad successfully');

    return new Response(JSON.stringify({
      title: adContent.title,
      copy: adContent.copy,
      imageUrl: imageUrl,
      imagePrompt: adContent.imagePrompt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-blog-ad function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate blog ad' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});