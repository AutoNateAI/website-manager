import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { sopDocumentId, templateId, conversationId, messages } = body as {
      sopDocumentId: string;
      templateId: string;
      conversationId?: string;
      messages?: Message[];
    };

    if (!sopDocumentId || !templateId || (!conversationId && (!messages || messages.length === 0))) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Load conversation
    let convo: { conversation_data: Message[]; id: string } | null = null;
    if (conversationId) {
      const { data, error } = await supabase
        .from('sop_conversations')
        .select('id, conversation_data')
        .eq('id', conversationId)
        .maybeSingle();
      if (error) throw error;
      if (data) convo = data as any;
    }

    if (!convo) {
      // Create conversation record from provided messages if not existing
      const { data, error } = await supabase
        .from('sop_conversations')
        .insert({
          sop_document_id: sopDocumentId,
          conversation_data: messages,
          extraction_status: 'generating'
        })
        .select('id, conversation_data')
        .single();
      if (error) throw error;
      convo = data as any;
    }

    const conversationText = (convo?.conversation_data || [])
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    // Load template
    const { data: template, error: templateError } = await supabase
      .from('sop_templates')
      .select('id, title, category, sections, formatting_rules')
      .eq('id', templateId)
      .single();
    if (templateError || !template) {
      throw new Error('SOP template not found');
    }

    // Optional: Load a prompt template from DB, else use default
    const { data: promptTpl } = await supabase
      .from('prompt_templates')
      .select('prompt_content')
      .eq('template_type', 'sop_generation')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .limit(1)
      .maybeSingle();

    const systemPrompt = (promptTpl?.prompt_content as string | undefined) ?? `You are an expert at creating Standard Operating Procedures (SOPs). Follow the template strictly.

Return a JSON object with fields:
{
  "title": string,
  "summary": string,
  "sections": [
    { "id": string, "title": string, "content": string }
  ],
  "screenshot_placeholders": [
    { "section": string, "description": string }
  ]
}`;

    const userPrompt = `Template: ${template.title} (${template.category})\nSections: ${JSON.stringify(template.sections)}\nFormatting rules: ${JSON.stringify(template.formatting_rules)}\n\nConversation context:\n${conversationText}\n\nGenerate the SOP strictly following the sections order. If screenshots would help, insert screenshot_placeholders entries with concise descriptions.`;

    // Use GPT-5 for compliance with new params
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
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 2000,
      }),
    });

    const ai = await response.json();
    if (!response.ok) {
      console.error('OpenAI API error:', ai);
      throw new Error(ai.error?.message || 'Failed to generate SOP');
    }

    const content = ai.choices?.[0]?.message?.content || '';

    // Try parse JSON object in the response
    let parsed: any = null;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    } catch (e) {
      console.warn('Failed to parse JSON from AI response, falling back to raw content');
    }

    const sopTitle = parsed?.title ?? 'Generated SOP';
    const sections = parsed?.sections ?? [];
    const screenshotPlaceholders = parsed?.screenshot_placeholders ?? [];

    // Build HTML/Markdown content from sections
    const builtContent = sections.map((s: any) => `# ${s.title}\n\n${s.content}`).join('\n\n');

    // Update sop_document
    const generationMetadata = {
      template_id: templateId,
      template_title: template.title,
      screenshot_placeholders: screenshotPlaceholders,
      generated_with_model: 'gpt-5-2025-08-07',
      conversation_id: convo?.id,
    };

    const { error: updErr } = await supabase
      .from('sop_documents')
      .update({
        title: sopTitle,
        content: builtContent,
        structured_data: parsed ?? {},
        status: 'generated',
        template_id: templateId,
        generation_metadata: generationMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sopDocumentId);

    if (updErr) {
      console.error('Failed to update SOP document:', updErr);
      throw updErr;
    }

    // Create a version row
    await supabase
      .from('sop_versions')
      .insert({
        sop_document_id: sopDocumentId,
        version_number: 1,
        title: sopTitle,
        content: builtContent,
        structured_data: parsed ?? {},
        change_description: 'Initial AI-generated SOP',
        created_by: 'ai',
      });

    return new Response(JSON.stringify({ 
      ok: true, 
      sopDocumentId,
      title: sopTitle,
      sectionsCount: sections.length,
      screenshotPlaceholders
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in generate-sop function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
