import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { blogId, imageUpdates } = await req.json();

    if (!blogId || !imageUpdates || imageUpdates.length === 0) {
      throw new Error('Blog ID and image updates are required');
    }

    console.log(`Updating blog ${blogId} with ${imageUpdates.length} images`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current blog content
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('content')
      .eq('id', blogId)
      .single();

    if (blogError || !blog) {
      throw new Error('Failed to fetch blog content');
    }

    let updatedContent = blog.content;

    // Insert images into content at specified sections
    for (const update of imageUpdates) {
      const { imageUrl, section, alt_text, caption } = update;
      
      // Find the section heading in the content
      const lines = updatedContent.split('\n');
      let insertIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Look for markdown headings that match our section
        if (line.startsWith('#') && line.toLowerCase().includes(section.toLowerCase())) {
          insertIndex = i + 1;
          break;
        }
      }
      
      if (insertIndex !== -1) {
        // Create the image markdown
        const imageMarkdown = `\n![${alt_text || 'Generated image'}](${imageUrl})\n${caption ? `\n*${caption}*\n` : '\n'}`;
        
        // Insert the image after the heading
        lines.splice(insertIndex, 0, imageMarkdown);
        updatedContent = lines.join('\n');
      }
    }

    // Update the blog content
    const { error: updateError } = await supabase
      .from('blogs')
      .update({ 
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', blogId);

    if (updateError) {
      throw new Error('Failed to update blog content');
    }

    console.log(`Successfully updated blog ${blogId} with images`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Blog content updated with images'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-blog-with-images function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to update blog with images' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});