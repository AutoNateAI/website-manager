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

interface ImageRequest {
  prompt: string;
  title: string;
  alt_text?: string;
  caption?: string;
  size?: string;
  quality?: string;
  referenceImage?: string;
  blog_id?: string;
  blog_section?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, batchId } = await req.json() as { 
      images: ImageRequest[], 
      batchId: string 
    };

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!images || images.length === 0) {
      throw new Error('No images to generate');
    }

    console.log(`Starting bulk generation for batch ${batchId} with ${images.length} images`);

    // Create session record
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: sessionError } = await supabase
      .from('generation_sessions')
      .insert([{
        batch_id: batchId,
        total_images: images.length,
        completed_images: 0,
        status: 'active'
      }]);

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
    }

    // Start background task for bulk generation
    const backgroundTask = async () => {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const generateSingleImage = async (imageReq: ImageRequest, index: number) => {
        try {
          console.log(`Generating image ${index + 1}/${images.length}: ${imageReq.prompt}`);
          
          let response;
          
          if (imageReq.referenceImage) {
            // Use edits endpoint for reference images with form data
            const formData = new FormData();
            formData.append('model', 'gpt-image-1');
            formData.append('prompt', imageReq.prompt);
            
            // Convert base64 to blob and add as image
            const base64Data = imageReq.referenceImage.split(',')[1];
            const imageBlob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: 'image/png' });
            formData.append('image[]', imageBlob, 'reference.png');
            
            response = await fetch('https://api.openai.com/v1/images/edits', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
              },
              body: formData,
            });
          } else {
            // Use generations endpoint for text-only prompts
            const enhancedPrompt = `${imageReq.prompt}. 
              Style: Professional illustration, modern design, high quality, detailed, 
              wide format (1536x1024), suitable for blog content, engaging visual.
              CRITICAL: Always include a vibrant, colorful background - NO transparent backgrounds.
              Use rich colors, gradients, or textured backgrounds that complement the subject.`;

            const requestBody = {
              model: 'gpt-image-1',
              prompt: enhancedPrompt,
              n: 1,
              size: imageReq.size || "1536x1024",
              quality: "high",
              output_format: 'png'
            };

            response = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });
          }

          const data = await response.json();
          
          if (!response.ok) {
            console.error(`OpenAI Image API error for image ${index + 1}:`, data);
            throw new Error(data.error?.message || 'Failed to generate image');
          }

          const imageData = data.data[0].b64_json;
          
          // Convert base64 to blob and upload to Supabase Storage
          const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
          const fileName = `${batchId}-${index + 1}-${Date.now()}.png`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(fileName, imageBuffer, {
              contentType: 'image/png',
              upsert: false
            });

          if (uploadError) {
            console.error(`Storage upload error for image ${index + 1}:`, uploadError);
            throw uploadError;
          }

          // Get public URL for the uploaded image
          const { data: urlData } = supabase.storage
            .from('generated-images')
            .getPublicUrl(fileName);

          const imageUrl = urlData.publicUrl;

          // Save to database
          const { error: insertError } = await supabase
            .from('images')
            .insert([{
              title: imageReq.title,
              alt_text: imageReq.alt_text || imageReq.prompt,
              caption: imageReq.caption,
              url: imageUrl,
              width: 1024,
              height: 1024,
              blog_id: imageReq.blog_id || null,
              blog_section: imageReq.blog_section || null,
              generation_batch_id: batchId,
            }]);

          if (insertError) {
            console.error(`Database error for image ${index + 1}:`, insertError);
            throw insertError;
          }

          console.log(`Successfully generated and saved image ${index + 1}/${images.length}`);
          
          // Update session progress
          const { data: sessionData } = await supabase
            .from('generation_sessions')
            .select('completed_images')
            .eq('batch_id', batchId)
            .single();
          
          if (sessionData) {
            await supabase
              .from('generation_sessions')
              .update({ 
                completed_images: sessionData.completed_images + 1,
                updated_at: new Date().toISOString()
              })
              .eq('batch_id', batchId);
          }
          
        } catch (error) {
          console.error(`Error generating image ${index + 1}:`, error);
          // Continue with other images even if one fails
        }
      };

      // Generate all images in parallel
      await Promise.allSettled(
        images.map((imageReq, index) => generateSingleImage(imageReq, index))
      );

      // Mark session as completed
      await supabase
        .from('generation_sessions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('batch_id', batchId);

      // If images have blog_id, trigger blog content update
      const blogImages = images.filter(img => img.blog_id);
      if (blogImages.length > 0) {
        const uniqueBlogIds = [...new Set(blogImages.map(img => img.blog_id))];
        
        for (const blogId of uniqueBlogIds) {
          try {
            const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/update-blog-with-images`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({
                blogId,
                batchId
              }),
            });
            
            if (!response.ok) {
              console.error(`Failed to update blog ${blogId}:`, await response.text());
            } else {
              console.log(`Successfully triggered blog update for ${blogId}`);
            }
          } catch (error) {
            console.error(`Error updating blog ${blogId}:`, error);
          }
        }
      }

      console.log(`Completed bulk generation for batch ${batchId}`);
    };

    // Start background task without awaiting
    EdgeRuntime.waitUntil(backgroundTask());

    // Return immediate response
    return new Response(JSON.stringify({
      success: true,
      message: `Started generating ${images.length} images`,
      batchId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in bulk-generate-images function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to start bulk generation' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Handle function shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown due to:', ev.detail?.reason);
});