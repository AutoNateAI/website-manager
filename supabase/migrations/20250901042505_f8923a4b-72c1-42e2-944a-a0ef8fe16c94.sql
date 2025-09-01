-- Create enum for prompt template types
CREATE TYPE public.prompt_template_type AS ENUM ('concept', 'caption', 'image_prompts');

-- Create prompt_templates table
CREATE TABLE public.prompt_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type prompt_template_type NOT NULL,
  platform TEXT,
  style TEXT,
  voice TEXT,
  media_type TEXT,
  template TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for admin-only access
CREATE POLICY "Admin only access to prompt templates"
ON public.prompt_templates
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prompt_templates_updated_at
BEFORE UPDATE ON public.prompt_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.prompt_templates (type, platform, style, voice, media_type, template, is_default) VALUES
(
  'concept',
  'linkedin',
  NULL,
  NULL,
  'evergreen',
  'You are a social media marketing expert specializing in {{platform}} content creation.

Generate **3 distinct and engaging post concepts** for {{platform}} based on the following:
- **Post Title**: {{title}}
- **Platform**: {{platform}}
- **Style**: {{style}}
- **Voice**: {{voice}}
- **Media Type**: {{media_type}}
{{#if context_direction}}
- **Context Direction**: {{context_direction}}
{{/if}}

{{#if source_content}}
**Source Content Summary:**
{{source_content}}
{{/if}}

**Requirements:**
1. Each concept should be **unique and creative**
2. Optimize for {{platform}} best practices and engagement
3. Match the specified **{{style}} style** and **{{voice}} voice**
{{#if media_type}}
4. Consider this is **{{media_type}}** content
{{/if}}
5. Include relevant hashtags and call-to-actions
6. Make concepts shareable and discussion-worthy

**Response Format (JSON):**
```json
{
  "concepts": [
    {
      "hook": "Attention-grabbing opening line",
      "main_message": "Core message or value proposition", 
      "call_to_action": "What you want readers to do",
      "target_audience": "Who this resonates with most",
      "engagement_strategy": "Why this will generate comments/shares"
    }
  ]
}
```',
  true
),
(
  'caption',
  'linkedin',
  NULL,
  NULL,
  NULL,
  'You are a social media copywriter expert creating engaging {{platform}} content.

Create a compelling caption and hashtags for:
- **Platform**: {{platform}}
- **Style**: {{style}}
- **Voice**: {{voice}}
- **Post Concept**: {{concept}}

{{#if source_content}}
**Source Content:**
{{source_content}}
{{/if}}

**Caption Requirements:**
- Hook readers in the first line
- Use {{voice}} tone throughout
- Match {{style}} style guidelines  
- Include strategic line breaks for readability
- Add compelling call-to-action
- Optimize for {{platform}} algorithm

**Hashtag Strategy:**
- Mix of trending and niche hashtags
- 5-10 relevant hashtags for {{platform}}
- Include industry-specific tags

**Response Format (JSON):**
```json
{
  "caption": "Your engaging caption with proper formatting and line breaks",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}
```',
  true
),
(
  'image_prompts',
  'linkedin',
  NULL,
  NULL,
  NULL,
  'You are an expert visual content creator specializing in {{platform}} carousel posts.

Create **9 detailed image prompts** for a carousel post about:
- **Platform**: {{platform}}
- **Style**: {{style}}  
- **Voice**: {{voice}}
- **Post Content**: {{concept}}

{{#if source_content}}
**Source Material:**
{{source_content}}
{{/if}}

**Visual Guidelines:**
- Professional, engaging visuals optimized for {{platform}}
- Consistent visual style across all 9 images
- Clear, readable text overlays
- Strong visual hierarchy and flow
- Colors and design matching {{style}} aesthetic

**Carousel Structure:**
1. **Hook Image** - Grab attention immediately
2-8. **Value/Content Images** - Deliver core information
9. **Call-to-Action Image** - Drive engagement

**Response Format (JSON):**
```json
{
  "image_prompts": [
    {
      "slide_number": 1,
      "image_prompt": "Detailed visual description for DALL-E generation",
      "alt_text": "Accessibility description of the image content",
      "text_overlay": "Any text that should appear on the image"
    }
  ]
}
```

**Each prompt should be:**
- Specific and detailed for AI image generation
- Consistent in style and branding
- Optimized for {{platform}} carousel format
- Professional and visually appealing',
  true
);