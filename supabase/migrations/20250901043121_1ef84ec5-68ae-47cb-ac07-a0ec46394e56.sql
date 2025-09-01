-- Remove existing default templates for LinkedIn to avoid duplicates
DELETE FROM public.prompt_templates 
WHERE platform = 'linkedin' AND is_default = true AND type IN ('caption', 'image_prompts', 'concept');

-- Insert CAPTION template (matches current flow)
INSERT INTO public.prompt_templates (type, platform, style, voice, media_type, template, is_default)
VALUES (
  'caption',
  'linkedin',
  NULL,
  NULL,
  NULL,
  'Create an engaging {{platform}} {{style}} post using a {{voice}} voice based on this concept.\n\nTitle/Hook: {{concept.title}}\nTarget Audience: {{concept.targetAudience}}\nContent Angle: {{concept.angle}}\nKey Messages: {{concept.keyMessages}}\nCall to Action: {{concept.callToAction}}\n\n{{#if source_content}}Source Content:\n{{source_content}}\n{{/if}}\n\nCreate:\n1. A compelling caption (optimized for {{platform}})\n2. 8-15 relevant hashtags\n\nReturn in JSON format:\n```json\n{\n  "caption": "engaging caption text",\n  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]\n}\n```',
  true
);

-- Insert IMAGE_PROMPTS template (matches current flow)
INSERT INTO public.prompt_templates (type, platform, style, voice, media_type, template, is_default)
VALUES (
  'image_prompts',
  'linkedin',
  NULL,
  NULL,
  NULL,
  'Create 9 animated visual story slides for {{platform}} that tell a cohesive narrative. Each image MUST be consistently ANIMATED/ILLUSTRATED style with bold text overlays that advance the story.\n\nSTORY CONCEPT:\nTitle: {{concept.title}}\nTarget Audience: {{concept.targetAudience}}\nContent Angle: {{concept.angle}}\nKey Messages: {{concept.keyMessages}}\nCaption: {{caption}}\n\n{{#if source_content}}Source Content:\n{{source_content}}\n{{/if}}\n\nCRITICAL STORY STRUCTURE - Each slide builds on the previous:\nSlide 1 (SCROLL STOPPER): Bold animated illustration with attention-grabbing hook text overlay.\nSlide 2: Animated illustration showing emotional pain/frustration.\nSlide 3: "Aha moment" animated illustration introducing solution.\nSlide 4: Positive outcomes/benefits.\nSlide 5: Process/how-it-works diagram.\nSlide 6: Before/after comparison.\nSlide 7: Social proof.\nSlide 8: Urgency/desire building.\nSlide 9 (STRONG CTA): Clear next-step call-to-action.\n\nVISUAL REQUIREMENTS:\n- Consistent animated/illustrated style\n- Bold, readable text overlays\n- High contrast colors\n- Mobile-optimized composition\n\nReturn JSON: { "images": [{ "prompt": "...", "alt_text": "..." }] }',
  true
);

-- Insert CONCEPT templates per media_type to mirror previous logic
INSERT INTO public.prompt_templates (type, platform, style, voice, media_type, template, is_default)
VALUES
('concept','linkedin',NULL,NULL,'company_targeting',
'Evolve 3 distinct B2B social media post concepts for {{platform}} targeting decision-makers at companies. Use a {{style}} style and {{voice}} voice about "{{title}}".\n\nFocus on:\n- B2B decision maker pain points and challenges\n- ROI and business value propositions\n- Industry-specific insights and trends\n- Competitive advantages and differentiation\n- Strategic business outcomes\n\nEach concept should address different aspects of company targeting:\n1. Problem-Focused: Identify and address specific business challenges\n2. Solution-Oriented: Present clear value propositions and outcomes\n3. Authority-Building: Establish thought leadership and expertise\n\n{{#if source_content}}\nBased on this source content:\n{{source_content}}\n{{/if}}\n\nEach concept must include: hook, angle, targetAudience, keyMessages (3), tone, callToAction.\nReturn JSON with {"concepts": [...]} as in the schema used in flow.', true),

('concept','linkedin',NULL,NULL,'evergreen',
'Create 3 distinct evergreen social media post concepts for {{platform}} with a {{style}} style and {{voice}} voice about "{{title}}".\n\nFocus on:\n- Timeless educational value and insights\n- Broad applicability across audiences\n- Universal principles and best practices\n- Content that stays relevant over time\n- Educational frameworks and methodologies\n\nEach concept should offer different educational approaches:\n1. Foundational Knowledge: Core principles and fundamentals\n2. Practical Application: How-to guides and actionable steps\n3. Strategic Thinking: Higher-level insights and frameworks\n\n{{#if source_content}}\nBased on this source content:\n{{source_content}}\n{{/if}}\n\nEach concept must include: hook, angle, targetAudience, keyMessages (3), tone, callToAction.\nReturn JSON with {"concepts": [...]} as in the schema used in flow.', true),

('concept','linkedin',NULL,NULL,'advertisement',
'Create 3 distinct promotional social media post concepts for {{platform}} with a {{style}} style and {{voice}} voice about "{{title}}".\n\nFocus on:\n- Product features and unique benefits\n- Clear value propositions and outcomes\n- Conversion-focused messaging and CTAs\n- Social proof and credibility indicators\n- Urgency and compelling reasons to act now\n\nEach concept should use different promotional approaches:\n1. Feature-Benefit: Highlight key features and their benefits\n2. Social Proof: Use testimonials, case studies, or success stories\n3. Urgency/Scarcity: Create compelling reasons to act immediately\n\n{{#if source_content}}\nBased on this source content:\n{{source_content}}\n{{/if}}\n\nEach concept must include: hook, angle, targetAudience, keyMessages (3), tone, callToAction.\nReturn JSON with {"concepts": [...]} as in the schema used in flow.', true);
