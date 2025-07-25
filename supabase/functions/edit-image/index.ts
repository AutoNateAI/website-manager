import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    const { originalImageUrl, editPrompt, size = "1920x1080" } = await req.json();

    console.log('Editing image with prompt:', editPrompt);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a comprehensive edit prompt that includes the original context
    const fullPrompt = `Edit this image: ${editPrompt}. Maintain the overall composition and quality. Make the changes naturally and professionally. Ensure the result is high-quality and suitable for blog content.`;

    const requestBody = {
      model: 'gpt-image-1',
      prompt: fullPrompt,
      n: 1,
      size: size,
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
      throw new Error(data.error?.message || 'Failed to edit image');
    }

    const imageData = data.data[0].b64_json;
    
    // Upload the new image to Supabase Storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const fileName = `edited-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
    
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

    const newImageUrl = urlData.publicUrl;

    console.log('Generated edited image successfully');

    return new Response(JSON.stringify({
      newImageUrl,
      originalImageUrl,
      editPrompt,
      size
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in edit-image function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to edit image' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});