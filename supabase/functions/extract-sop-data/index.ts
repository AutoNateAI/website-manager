import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, sopDocumentId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get the conversation data
    const { data: conversation, error: convError } = await supabase
      .from('sop_conversations')
      .select('conversation_data, sop_document_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    // Get the SOP document for context
    const { data: sopDoc } = await supabase
      .from('sop_documents')
      .select('title, description, category')
      .eq('id', sopDocumentId || conversation.sop_document_id)
      .single();

    const systemPrompt = `You are an expert at extracting structured operational data from conversations. 

Analyze the conversation and extract:
1. Key processes and procedures
2. Decision criteria and thresholds 
3. Tools and resources mentioned
4. Success metrics and KPIs
5. Best practices and guidelines
6. Common issues and solutions
7. Roles and responsibilities
8. Templates and checklists

Return a JSON object with this structure:
{
  "processes": [
    {
      "name": "Process name",
      "description": "What this process does",
      "steps": ["step1", "step2"],
      "tools": ["tool1", "tool2"],
      "metrics": ["metric1", "metric2"]
    }
  ],
  "decision_criteria": [
    {
      "decision": "What decision is being made",
      "criteria": ["criteria1", "criteria2"],
      "thresholds": {"metric": "value"}
    }
  ],
  "best_practices": [
    {
      "category": "category",
      "practice": "description of best practice",
      "rationale": "why this works"
    }
  ],
  "tools_resources": [
    {
      "name": "Tool name",
      "purpose": "What it's used for", 
      "configuration": "Any setup details"
    }
  ],
  "metrics_kpis": [
    {
      "name": "Metric name",
      "description": "What it measures",
      "target": "Target value or range"
    }
  ],
  "common_issues": [
    {
      "issue": "Problem description",
      "solution": "How to solve it",
      "prevention": "How to prevent it"
    }
  ]
}

SOP Context: ${JSON.stringify(sopDoc)}`;

    const conversationText = conversation.conversation_data
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract structured data from this conversation:\n\n${conversationText}` }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to extract SOP data');
    }

    const generatedContent = data.choices[0].message.content;
    let extractedData;
    
    try {
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse extracted SOP data:', parseError);
      throw new Error('Failed to parse extracted SOP data');
    }

    // Update the conversation with extracted data
    const { error: updateError } = await supabase
      .from('sop_conversations')
      .update({
        extracted_data: extractedData,
        extraction_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Failed to update conversation:', updateError);
    }

    // Update the SOP document with the extracted data
    const { error: sopUpdateError } = await supabase
      .from('sop_documents')
      .update({
        structured_data: extractedData,
        status: 'extracted',
        updated_at: new Date().toISOString()
      })
      .eq('id', sopDocumentId || conversation.sop_document_id);

    if (sopUpdateError) {
      console.error('Failed to update SOP document:', sopUpdateError);
    }

    console.log('Successfully extracted SOP data:', extractedData);

    return new Response(JSON.stringify({ 
      extractedData,
      conversationId,
      sopDocumentId: sopDocumentId || conversation.sop_document_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-sop-data function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});